'use strict';
const places = [
 {name:'G-Drive Арена',category:'Спорт и архитектура',subtitle:'Дом омского «Авангарда»',address:'Улица Лукашевича, 35',coords:[55.009121,73.297532],photo:'arena',source:'https://gdrive-arena.ru/',credit:'G-Drive Арена · официальный сайт',date:'Дата съёмки не указана',description:'Современная ледовая арена на левом берегу Иртыша и домашняя площадка хоккейного клуба «Авангард». Вокруг — прогулочная территория с видами на реку. Здесь начинается наш маршрут: до исторического центра предстоит перейти Иртыш по мосту.'},
 {name:'Успенский собор',category:'Архитектура',subtitle:'Золотые купола Соборной площади',address:'Соборная площадь · Тарская улица, 7',coords:[54.99018,73.36702],photo:'cathedral',source:'https://www.om1.ru/news/society/426573-v_omske_s_razmakhom_otmetjat_vosstanovlenie_uspenskogo_sobora/',credit:'Юлия Майстренко / Om1',date:'Публикация: 14 июля 2026',description:'Белоснежный собор с золотыми и бирюзовыми куполами — один из самых узнаваемых силуэтов Омска. Исторический храм конца XIX века был воссоздан в 2007 году. Остановитесь на Соборной площади, чтобы рассмотреть фасады и сделать панорамный снимок.'},
 {name:'Омская крепость',category:'История города',subtitle:'Место, с которого всё началось',address:'Исторический комплекс · Партизанская улица',coords:[54.9856893,73.362869],photo:'fortress',source:'https://omskkrepost.ru/',credit:'Омская крепость · официальный сайт',date:'Дата съёмки не указана',description:'История Омска началась с крепости в 1716 году. Сегодня здесь можно прогуляться среди исторических зданий и ворот, заглянуть на музейные выставки и почувствовать масштаб старого города. От крепости удобно выйти к берегу Иртыша.'},
 {name:'Иртышская набережная',category:'У реки',subtitle:'Обновлённый берег у крепости',address:'Берег Иртыша · участок у Омской крепости',coords:[54.98515,73.36125],photo:'embankment',source:'https://newsomsk.ru/news/163431-kak_preobrazilas_naberejnaya_irtsha_fotoprogulka_p/',credit:'Светлана Бронникова / «Новый Омск»',date:'Публикация: 29 августа 2026',description:'Обновлённое в 2026 году общественное пространство рядом с Омской крепостью. Прогулочные дорожки, места для отдыха и открытые виды на Иртыш позволяют ненадолго замедлиться. Точка маршрута обозначает прогулочный участок у крепости.'},
 {name:'Фонтан Дзержинского',category:'Городская жизнь',subtitle:'Финал прогулки в зелёном сквере',address:'Сквер имени Дзержинского · напротив мэрии',coords:[54.9893776,73.3736708],photo:'fountain',source:'https://omskgazzeta.ru/all-news/v-skvere-dzerzhinskogo-v-omske-ukrashajut-fontan/amp/',credit:'Татьяна Попова / «Вечерний Омск»',date:'Публикация: ноябрь 2026',description:'Фонтан в сквере имени Дзержинского — выбранная вами последняя остановка. Летом здесь приятно отдохнуть у воды, а к зиме фонтан украшают световыми конструкциями. Это фонтан напротив мэрии; новый мультимедийный фонтан у крепости находится в другом месте.'}
];
const $ = id => document.getElementById(id);
const state = {mode:new URLSearchParams(location.search).get('mode')==='cycling'?'cycling':'walking', selected:null, map:null, markers:[],routeLayer:null, routeData:null, request:0, provider:'osm'};
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const distanceText = m => m>=1000 ? `${(m/1000).toFixed(1).replace('.',',')} км` : `${Math.round(m)} м`;
function durationText(sec){const minutes=Math.max(1,Math.round(sec/60)); return minutes>=60 ? `${Math.floor(minutes/60)} ч${minutes%60 ? ' '+minutes%60+' мин' : ''}` : `${minutes} мин`;}
function yandexUrl(single){const url=new URL('https://yandex.ru/maps/66/omsk/');url.searchParams.set('mode','routes');url.searchParams.set('rtext',single==null?places.map(p=>p.coords.join(',')).join('~'):'~'+places[single].coords.join(','));url.searchParams.set('rtt',state.mode==='walking'?'pd':'bc');return url.href;}
function status(message){$('map-status').textContent=message;$('map-status').hidden=!message;}
function markerIcon(i){return L.divIcon({className:'marker-shell',html:`<div class="pin ${i===state.selected?'chosen':''}"><span>${i+1}</span></div>`,iconSize:[35,35],iconAnchor:[17,35]});}
function updateList(){
 $('places').innerHTML=places.map((p,i)=>`<button class="stop ${state.selected===i?'selected':''}" data-stop="${i}" aria-label="${i+1}. ${escapeHtml(p.name)}" aria-pressed="${state.selected===i}"><span class="stop-number">${i+1}</span><img src="assets/${p.photo}.jpg" alt="" loading="lazy"><span class="stop-copy"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(i===0?'Начало маршрута':state.routeData ? distanceText(state.routeData.legs[i-1].distance)+' от предыдущей точки':p.subtitle)}</small></span><span class="stop-arrow">↗</span></button>`).join('');
 $('places').querySelectorAll('[data-stop]').forEach(btn=>btn.addEventListener('click',()=>selectPlace(Number(btn.dataset.stop),true)));
}
function selectPlace(i,pan=false){
 state.selected=i; const p=places[i];updateList();
 if(state.provider==='osm')state.markers.forEach((m,j)=>m.setIcon(markerIcon(j)));
 const card=$('card');card.innerHTML=`<img class="card-photo" src="assets/${p.photo}.jpg" alt="${escapeHtml(p.name)}"><button class="card-close" aria-label="Закрыть карточку">×</button><div class="photo-credit"><a href="${p.source}" target="_blank" rel="noopener">Фото: ${escapeHtml(p.credit)} ↗</a><br>${escapeHtml(p.date)}</div><div class="card-body"><div class="card-tag">МЕСТО ${String(i+1).padStart(2,'0')} / ${escapeHtml(p.category)}</div><h2>${escapeHtml(p.name)}</h2><p class="address">${escapeHtml(p.address)}</p><p class="description">${escapeHtml(p.description)}</p><div class="card-actions"><a href="${yandexUrl(i)}" target="_blank" rel="noopener">Сюда в Яндекс Картах ↗</a><button id="next-stop">${i===places.length-1?'К началу ↺':'Дальше →'}</button></div></div>`;card.hidden=false;
 card.querySelector('.card-close').addEventListener('click',closeCard);$('next-stop').addEventListener('click',()=>selectPlace((i+1)%places.length,true));
 card.querySelector('img').addEventListener('error',e=>{e.target.style.display='none';const note=document.createElement('div');note.className='image-error';note.textContent='Фото доступно по ссылке на источник';card.prepend(note);});
 if(pan && state.map){if(state.provider==='osm'){const target=state.map.project(p.coords,Math.max(state.map.getZoom(),14));if(innerWidth>1000)target.x+=120;state.map.setView(state.map.unproject(target,Math.max(state.map.getZoom(),14)),Math.max(state.map.getZoom(),14));}else state.map.setCenter(p.coords,15);if(innerWidth<=700)document.querySelector('.map-section').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
}
function closeCard(){state.selected=null;$('card').hidden=true;updateList();if(state.provider==='osm')state.markers.forEach((m,i)=>m.setIcon(markerIcon(i)));}
function fit(){closeCard();if(!state.map)return;if(state.provider==='osm')state.map.fitBounds(state.routeLayer ? state.routeLayer.getBounds() : L.latLngBounds(places.map(p=>p.coords)),{padding:[48,60]});else state.map.setBounds(state.routeLayer.getBounds(),{checkZoomRange:true,zoomMargin:55});}
async function loadRoute(){
 const request=++state.request; const mode=state.mode;
 $('yandex-route').href=yandexUrl();$('map-title').textContent=mode==='walking'?'ПЕШИЙ МАРШРУТ':'ВЕЛОСИПЕДНЫЙ МАРШРУТ';
 for(const name of ['walking','cycling']){$(name).classList.toggle('active',mode===name);$(name).setAttribute('aria-pressed',String(mode===name));}
 if(state.selected!==null)selectPlace(state.selected);
 if(state.provider==='yandex')return loadYandexRoute(request);
 status('Строим '+(mode==='walking'?'пеший':'велосипедный')+' маршрут…');
 state.routeData=null;$('distance').textContent='—';$('duration').textContent='—';updateList();
 if(state.routeLayer){state.map.removeLayer(state.routeLayer);state.routeLayer=null;}
 try{
  const response=await fetch(`route-${mode}.json`);if(!response.ok)throw Error('route');const route=await response.json();if(request!==state.request)return;
  state.routeData=route;
  state.routeLayer=L.geoJSON(route.geometry,{style:{color:mode==='walking'?'#b45232':'#2e665b',weight:5,opacity:.9,lineCap:'round',lineJoin:'round'}}).addTo(state.map);
  state.markers.forEach(m=>m.setZIndexOffset(100));$('distance').textContent=distanceText(route.distance);$('duration').textContent=durationText(route.duration);updateList();status('');if(state.selected===null)fit();
 }catch{if(request!==state.request)return;status('Не удалось загрузить путь. Точки доступны; откройте маршрут в Яндекс Картах.');}
}
function initOsm(){
 state.provider='osm';if(!window.L){status('Не удалось загрузить карту. Выберите место из списка или откройте маршрут в Яндекс Картах.');return;}
 state.map=L.map('map',{zoomControl:true,scrollWheelZoom:true}).setView([54.996,73.34],13);
 L.control.zoom({position:'topright'}).addTo(state.map);
 let tileErrors=0;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).on('tileerror',()=>{if(++tileErrors===5)status('Подложка карты недоступна. Точки и путь показаны; навигацию можно открыть в Яндекс Картах.');}).addTo(state.map);
 state.markers=places.map((p,i)=>L.marker(p.coords,{icon:markerIcon(i),title:`${i+1}. ${p.name}`,keyboard:true,alt:p.name}).addTo(state.map).on('click',()=>selectPlace(i,true)));
 new ResizeObserver(()=>state.map.invalidateSize()).observe($('map'));
 loadRoute();
}
async function init(){
 updateList();$('yandex-route').href=yandexUrl();
 if(window.OMSK_CONFIG?.yandexApiKey){try{await loadYandex();return;}catch{status('Яндекс Карты недоступны. Включаем резервную карту.');}}
 initOsm();
}
function loadYandex(){return new Promise((resolve,reject)=>{const script=document.createElement('script');const timer=setTimeout(reject,12000);script.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey='+encodeURIComponent(window.OMSK_CONFIG.yandexApiKey);script.onerror=()=>{clearTimeout(timer);reject();};script.onload=()=>{if(!window.ymaps){reject();return;}window.ymaps.ready(()=>{clearTimeout(timer);state.provider='yandex';state.map=new ymaps.Map('map',{center:[54.996,73.34],zoom:13,controls:['zoomControl']});state.markers=places.map((p,i)=>{const m=new ymaps.Placemark(p.coords,{iconContent:String(i+1),hintContent:p.name},{preset:'islands#circleIcon',iconColor:'#b45232'});m.events.add('click',()=>selectPlace(i));state.map.geoObjects.add(m);return m;});loadRoute();resolve();});};document.head.appendChild(script);});}
function loadYandexRoute(request){
 status('Строим маршрут в Яндекс Картах…');$('distance').textContent='—';$('duration').textContent='—';state.routeData=null;updateList();
 if(state.routeLayer)state.map.geoObjects.remove(state.routeLayer);
 const route=new ymaps.multiRouter.MultiRoute({referencePoints:places.map(p=>p.coords),params:{routingMode:state.mode==='walking'?'pedestrian':'bicycle',results:1}},{boundsAutoApply:true,wayPointVisible:false,routeActiveStrokeColor:state.mode==='walking'?'#b45232':'#2e665b',routeActiveStrokeWidth:5});state.routeLayer=route;state.map.geoObjects.add(route);
 route.model.events.add('requestsuccess',()=>{if(request!==state.request)return;const active=route.getActiveRoute();if(!active){status('Яндекс не нашёл путь. Попробуйте другой способ передвижения.');return;}$('distance').textContent=distanceText(active.properties.get('distance').value);$('duration').textContent=durationText(active.properties.get('duration').value);status('');});
 route.model.events.add('requestfail',()=>{if(request===state.request)status('Яндекс не смог построить маршрут. Проверьте ключ API или откройте маршрут по ссылке.');});
}
for(const mode of ['walking','cycling'])$(mode).addEventListener('click',()=>{if(state.mode===mode)return;state.mode=mode;loadRoute();});
$('fit').addEventListener('click',fit);
$('locate').addEventListener('click',()=>{if(!navigator.geolocation){status('Браузер не поддерживает определение местоположения.');return;}status('Определяем ваше местоположение…');navigator.geolocation.getCurrentPosition(pos=>{const coords=[pos.coords.latitude,pos.coords.longitude];if(!state.map)return;if(state.provider==='osm'){if(state.locationMarker)state.map.removeLayer(state.locationMarker);state.locationMarker=L.marker(coords,{icon:L.divIcon({html:'<div class="location-dot"></div>',className:'',iconSize:[15,15]})}).addTo(state.map);state.map.setView(coords,15);}else{state.map.geoObjects.add(new ymaps.Placemark(coords,{hintContent:'Вы здесь'},{preset:'islands#blueCircleDotIcon'}));state.map.setCenter(coords,15);}status('');},()=>status('Местоположение недоступно. Разрешите геолокацию в настройках браузера.'),{timeout:10000,maximumAge:60000});});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCard();});
let qrSvg='';
function publicUrl(value){try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;const host=u.hostname.toLowerCase();if(host==='localhost'||host==='[::1]'||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)||!host.includes('.'))return null;return u.href;}catch{return null;}}
function updateQr(){const value=publicUrl($('share-url').value.trim());$('qr').innerHTML='';qrSvg='';$('copy-status').textContent='';$('download-qr').disabled=$('copy-link').disabled=!value;$('qr-note').textContent=value?'Доступ по QR-коду зависит от настроек доступа к сайту.':'Сначала опубликуйте сайт и вставьте публичный адрес. Локальная ссылка работает только на этом компьютере.';if(!value)return;try{const qr=qrcode(0,'M');qr.addData(value,'Byte');qr.make();qrSvg=qr.createSvgTag({cellSize:5,margin:20,scalable:true});$('qr').innerHTML=qrSvg;}catch{$('qr-note').textContent='Не удалось создать QR-код. Проверьте длину ссылки.';$('download-qr').disabled=true;}}
$('share').addEventListener('click',()=>{const url=new URL('./',location.href);if(state.mode==='cycling')url.searchParams.set('mode','cycling');$('share-url').value=publicUrl(location.href)?url.href:'';updateQr();$('share-dialog').showModal();});$('share-url').addEventListener('input',updateQr);
$('download-qr').addEventListener('click',()=>{if(!qrSvg)return;const url=URL.createObjectURL(new Blob([qrSvg],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='omsk-route-qr.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('copy-link').addEventListener('click',async()=>{const url=publicUrl($('share-url').value);if(!url)return;try{await navigator.clipboard.writeText(url);$('copy-status').textContent='Ссылка скопирована';}catch{$('share-url').select();$('copy-status').textContent='Ссылка выделена — скопируйте её вручную.';}});
init();
