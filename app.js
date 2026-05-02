const CITIES=[
{name:"الدوحة - قطر",label:"الدوحة",lat:25.2854,lng:51.5310,tz:3},
{name:"عمّان - الأردن",label:"عمّان",lat:31.9539,lng:35.9106,tz:3},
{name:"معان - الأردن",label:"معان",lat:30.1962,lng:35.7341,tz:3},
{name:"الكرك - الأردن",label:"الكرك",lat:31.1853,lng:35.7047,tz:3},
{name:"القدس - فلسطين",label:"القدس",lat:31.7683,lng:35.2137,tz:3},
{name:"مكة المكرمة - السعودية",label:"مكة",lat:21.3891,lng:39.8579,tz:3},
{name:"الرياض - السعودية",label:"الرياض",lat:24.7136,lng:46.6753,tz:3},
{name:"دبي - الإمارات",label:"دبي",lat:25.2048,lng:55.2708,tz:4},
{name:"لندن - بريطانيا",label:"لندن",lat:51.5072,lng:-.1276,tz:1},
{name:"إسطنبول - تركيا",label:"إسطنبول",lat:41.0082,lng:28.9784,tz:3}
];
const KAABA={lat:21.422487,lng:39.826206};
let selectedCity=JSON.parse(localStorage.getItem("selectedCity"))||CITIES[0];
let prayerMethod=localStorage.getItem("prayerMethod")||"4";
let darkMode=localStorage.getItem("darkMode")==="true";
let alertsEnabled=localStorage.getItem("alertsEnabled")==="true";
let alertSettings=JSON.parse(localStorage.getItem("alertSettings"))||{before:true,atTime:true};
let wakeBeforeFajr=Number(localStorage.getItem("wakeBeforeFajr")||35);
let sleepHours=Number(localStorage.getItem("sleepHours")||7);
let prayerTimes={}, alertTimers=[], deferredPrompt, qiblaBearing=0, smoothedHeading=null;
const el=id=>document.getElementById(id);
function toEnglish(v){return String(v).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d))}
function setText(id,v){const node=el(id); if(node) node.textContent=toEnglish(v)}
function initTabs(){document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".section").forEach(x=>x.classList.remove("active"));b.classList.add("active");el(b.dataset.tab).classList.add("active")})}
function initCity(){citySelect.innerHTML="";CITIES.forEach((c,i)=>{let o=document.createElement("option");o.value=i;o.textContent=c.name;if(c.label===selectedCity.label&&Number(c.lat).toFixed(3)===Number(selectedCity.lat).toFixed(3))o.selected=true;citySelect.appendChild(o)});citySelect.onchange=async()=>{selectedCity=CITIES[Number(citySelect.value)];localStorage.setItem("selectedCity",JSON.stringify(selectedCity));smoothedHeading=null;await refreshAll()}}
function initSettings(){el("prayerMethod").value=prayerMethod;el("wakeBeforeFajr").value=wakeBeforeFajr;el("sleepHours").value=sleepHours;el("notifyBefore").checked=alertSettings.before;el("notifyAtTime").checked=alertSettings.atTime;el("saveSettings").onclick=async()=>{prayerMethod=el("prayerMethod").value;wakeBeforeFajr=Number(el("wakeBeforeFajr").value||35);sleepHours=Number(el("sleepHours").value||7);alertSettings.before=el("notifyBefore").checked;alertSettings.atTime=el("notifyAtTime").checked;localStorage.setItem("prayerMethod",prayerMethod);localStorage.setItem("wakeBeforeFajr",wakeBeforeFajr);localStorage.setItem("sleepHours",sleepHours);localStorage.setItem("alertSettings",JSON.stringify(alertSettings));await refreshAll();alert("تم حفظ الإعدادات")}}
function applyDark(){document.body.classList.toggle("dark",darkMode);darkModeButton.textContent=darkMode?"☀️ الوضع الفاتح":"🌙 الوضع الداكن"}
darkModeButton.onclick=()=>{darkMode=!darkMode;localStorage.setItem("darkMode",String(darkMode));applyDark()};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;installButton.style.display="block"});
installButton.onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installButton.style.display="none"};
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");
function rad(d){return d*Math.PI/180} function deg(r){return r*180/Math.PI} function n360(v){v%=360;return v<0?v+360:v} function n24(v){v%=24;return v<0?v+24:v}
function dayOfYear(d){let s=new Date(Date.UTC(d.getFullYear(),0,0));return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-s)/86400000)}
function sunTime(date,rise){let zen=90.833,N=dayOfYear(date),lngH=selectedCity.lng/15,t=N+((rise?6:18)-lngH)/24,M=.9856*t-3.289,L=n360(M+1.916*Math.sin(rad(M))+.020*Math.sin(rad(2*M))+282.634),RA=n360(deg(Math.atan(.91764*Math.tan(rad(L))))),Lq=Math.floor(L/90)*90,RAq=Math.floor(RA/90)*90;RA=(RA+(Lq-RAq))/15;let sinD=.39782*Math.sin(rad(L)),cosD=Math.cos(Math.asin(sinD)),cosH=(Math.cos(rad(zen))-(sinD*Math.sin(rad(selectedCity.lat))))/(cosD*Math.cos(rad(selectedCity.lat)));if(cosH>1||cosH<-1)return null;let H=(rise?360-deg(Math.acos(cosH)):deg(Math.acos(cosH)))/15,T=H+RA-.06571*t-6.622,UT=n24(T-lngH);return n24(UT+selectedCity.tz)}
function decDate(d,h){let hh=Math.floor(h),mf=(h-hh)*60,mm=Math.floor(mf),ss=Math.round((mf-mm)*60);return new Date(d.getFullYear(),d.getMonth(),d.getDate(),hh,mm,ss)}
function fmtTime(d){return toEnglish(d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}))}
function fmtShort(t){if(!t)return"--";let c=String(t).replace(/\s?\(.+\)/,"").trim().split(":");return toEnglish(`${c[0].padStart(2,"0")}:${c[1].padStart(2,"0")}`)}
function fmtDate(d){return toEnglish(d.toLocaleDateString("ar-QA-u-nu-latn",{weekday:"long",year:"numeric",month:"long",day:"numeric"}))}
function fmtHijri(d){try{return toEnglish(new Intl.DateTimeFormat("ar-SA-u-ca-islamic-nu-latn",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(d))}catch{return"--"}}
function duration(ms){let s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return toEnglish(`${h} ساعة ${m} دقيقة ${sec} ثانية`)}
function updateClockSun(){let now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),tom=new Date(today);tom.setDate(today.getDate()+1);let srH=sunTime(today,true), ssH=sunTime(today,false), srtH=sunTime(tom,true), sstH=sunTime(tom,false);
let sr=srH==null?null:decDate(today,srH), ss=ssH==null?null:decDate(today,ssH), srt=srtH==null?null:decDate(tom,srtH), sst=sstH==null?null:decDate(tom,sstH);
setText("currentTime",fmtTime(now));setText("currentDate",fmtDate(now));setText("hijriDate",fmtHijri(now));
setText("sunriseToday",sr?fmtTime(sr):"--");setText("sunsetToday",ss?fmtTime(ss):"--");
setText("dayLengthToday",(sr&&ss)?duration(ss-sr):"--");setText("sunriseTomorrow",srt?fmtTime(srt):"--");setText("sunsetTomorrow",sst?fmtTime(sst):"--")}
async function loadPrayer(){try{let ts=Math.floor(Date.now()/1000),url=`https://api.aladhan.com/v1/timings/${ts}?latitude=${selectedCity.lat}&longitude=${selectedCity.lng}&method=${prayerMethod}`;let data=await(await fetch(url)).json(),t=data.data.timings;prayerTimes={Fajr:fmtShort(t.Fajr),Sunrise:fmtShort(t.Sunrise),Dhuhr:fmtShort(t.Dhuhr),Asr:fmtShort(t.Asr),Maghrib:fmtShort(t.Maghrib),Isha:fmtShort(t.Isha)};["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"].forEach((k,i)=>setText(["fajr","sunrisePrayer","dhuhr","asr","maghrib","isha"][i],prayerTimes[k]));let methodName={2:"MWL",3:"Umm Al-Qura",4:"Qatar"}[prayerMethod]||"Custom";prayerSource.textContent=selectedCity.label+" • طريقة الحساب: "+methodName;planSleep();scheduleAlerts()}catch{prayerSource.textContent="تعذر التحديث"}}
function wdesc(c){return({0:"سماء صافية",1:"غالباً صافي",2:"غائم جزئياً",3:"غائم",45:"ضباب",48:"ضباب كثيف",51:"رذاذ خفيف",53:"رذاذ متوسط",55:"رذاذ كثيف",61:"مطر خفيف",63:"مطر متوسط",65:"مطر غزير",80:"زخات خفيفة",81:"زخات متوسطة",82:"زخات قوية",95:"عواصف رعدية"})[c]||"حالة غير معروفة"}
async function loadWeather(){try{weatherStatus.textContent="مباشر";let url=`https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;let d=await(await fetch(url)).json(),c=d.current;setText("temperature",`${Math.round(c.temperature_2m)}°C`);weatherDescription.textContent=wdesc(c.weather_code);setText("apparentTemp",`${Math.round(c.apparent_temperature)}°C`);setText("humidity",`${c.relative_humidity_2m}%`);setText("windSpeed",`${Math.round(c.wind_speed_10m)} كم/س`);setText("precipitation",`${c.precipitation||0} mm`);setText("weatherTime",c.time?c.time.replace("T"," "):"--")}catch{weatherStatus.textContent="غير متاح";weatherDescription.textContent="تعذر جلب الطقس"}}
function timeToDate(t,base=new Date()){let [h,m]=t.split(":").map(Number),d=new Date(base);d.setHours(h,m,0,0);return d}
function planSleep(){if(!prayerTimes.Fajr||!prayerTimes.Isha)return;let now=new Date(),fajr=timeToDate(prayerTimes.Fajr),isha=timeToDate(prayerTimes.Isha);if(fajr<now)fajr.setDate(fajr.getDate()+1);let wake=new Date(fajr.getTime()-wakeBeforeFajr*60000);let sleep=new Date(wake.getTime()-sleepHours*3600000);let latestAfterIsha=new Date(isha.getTime()+90*60000);let reason=`لتحصل على ${sleepHours} ساعات نوم وتستيقظ قبل الفجر بـ ${wakeBeforeFajr} دقيقة.`;if(sleep<latestAfterIsha){sleep=latestAfterIsha;reason+= " تم تعديل وقت النوم ليكون بعد العشاء بوقت مناسب."}setText("suggestedSleep",fmtTime(sleep));setText("suggestedWake",fmtTime(wake));sleepReason.textContent=toEnglish(reason)}
function playSound(){new Audio("adhan.mp3").play().catch(()=>{try{let ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.value=.08;o.connect(g);g.connect(ctx.destination);o.start();setTimeout(()=>{o.stop();ctx.close()},800)}catch{}})}
function clearAlerts(){alertTimers.forEach(clearTimeout);alertTimers=[]}
function showN(title,body){playSound();new Notification(title,{body,icon:"icon.svg"})}
function scheduleAlerts(){clearAlerts();if(!alertsEnabled||!("Notification"in window)||Notification.permission!=="granted")return;["Fajr","Dhuhr","Asr","Maghrib","Isha"].forEach(k=>{let names={Fajr:"الفجر",Dhuhr:"الظهر",Asr:"العصر",Maghrib:"المغرب",Isha:"العشاء"},d=timeToDate(prayerTimes[k]);if(d<new Date())return;if(alertSettings.before){let ms=d-new Date()-600000;if(ms>0)alertTimers.push(setTimeout(()=>showN(`اقترب وقت صلاة ${names[k]}`,"باقي 10 دقائق"),ms))}if(alertSettings.atTime){let ms=d-new Date();if(ms>0)alertTimers.push(setTimeout(()=>showN(`حان وقت صلاة ${names[k]}`,selectedCity.label),ms))}})}
alertButton.onclick=async()=>{if(!("Notification"in window)){alert("التنبيهات غير مدعومة");return}if(!alertsEnabled){let p=await Notification.requestPermission();if(p!=="granted")return;alertsEnabled=true}else alertsEnabled=false;localStorage.setItem("alertsEnabled",String(alertsEnabled));updateAlertUI();scheduleAlerts()}
function updateAlertUI(){alertButton.textContent=alertsEnabled?"🔕 إيقاف التنبيهات":"🔔 التنبيهات";alertStatus.textContent=alertsEnabled?"مفعلة":"متوقفة";alertStatus.className=alertsEnabled?"alert-on":"alert-off"}
function qibla(lat,lng){let p1=rad(lat),p2=rad(KAABA.lat),dl=rad(KAABA.lng-lng),y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return n360(deg(Math.atan2(y,x)))}
function delta(a,b){return((b-a+540)%360)-180} function smooth(cur,next){return cur===null?next:n360(cur+delta(cur,next)*.16)}
function updateQibla(head=null){qiblaBearing=qibla(selectedCity.lat,selectedCity.lng);let rot=qiblaBearing;if(typeof head==="number"&&!Number.isNaN(head)){smoothedHeading=smooth(smoothedHeading,n360(head));rot=n360(qiblaBearing-smoothedHeading);setText("qiblaDegree",`${Math.round(qiblaBearing)}° | الجهاز ${Math.round(smoothedHeading)}°`)}else setText("qiblaDegree",`${Math.round(qiblaBearing)}° من الشمال`);qiblaNeedleWrap.style.transform=`rotate(${rot}deg)`}
function handleOrientation(e){let h=null;if(typeof e.webkitCompassHeading==="number")h=e.webkitCompassHeading;else if(typeof e.alpha==="number")h=360-e.alpha;if(typeof h==="number"&&!Number.isNaN(h))updateQibla(h)}
compassButton.onclick=()=>{if(typeof DeviceOrientationEvent==="undefined"){compassNote.textContent="البوصلة غير مدعومة";return}let start=()=>{window.removeEventListener("deviceorientation",handleOrientation,true);window.removeEventListener("deviceorientationabsolute",handleOrientation,true);window.addEventListener("deviceorientation",handleOrientation,true);window.addEventListener("deviceorientationabsolute",handleOrientation,true);compassNote.textContent="تم التشغيل. حرّك الجوال على شكل 8 للمعايرة."};if(typeof DeviceOrientationEvent.requestPermission==="function"){DeviceOrientationEvent.requestPermission().then(s=>s==="granted"?start():compassNote.textContent="لم يتم السماح بالبوصلة").catch(()=>compassNote.textContent="تعذر تشغيل البوصلة")}else start()}
gpsButton.onclick=()=>{if(!navigator.geolocation){alert("GPS غير مدعوم");return}gpsButton.textContent="📍 جاري التحديد...";navigator.geolocation.getCurrentPosition(async p=>{selectedCity={name:"موقعي الحالي",label:"موقعي",lat:p.coords.latitude,lng:p.coords.longitude,tz:3};localStorage.setItem("selectedCity",JSON.stringify(selectedCity));gpsButton.textContent="📍 موقعي";smoothedHeading=null;await refreshAll()},()=>{gpsButton.textContent="📍 موقعي";alert("تعذر تحديد الموقع")},{enableHighAccuracy:true,timeout:10000})}
function renderAdhkar(){morningList.innerHTML=window.MORNING_ADHKAR.map((x,i)=>`<div class="dhikr"><div class="dua-title">${toEnglish(i+1)}. ذكر الصباح</div><div class="dua-text">${x}</div></div>`).join("");eveningList.innerHTML=window.EVENING_ADHKAR.map((x,i)=>`<div class="dhikr"><div class="dua-title">${toEnglish(i+1)}. ذكر المساء</div><div class="dua-text">${x}</div></div>`).join("")}
function getDuas(){let custom=JSON.parse(localStorage.getItem("customDuas")||"[]");return [...window.PRESET_DUAS,...custom]}
function renderDuas(){let q=(duaSearch.value||"").trim();let list=getDuas().filter(d=>!q||(`${d.title} ${d.category} ${d.text}`).includes(q));duaList.innerHTML=list.map((d,i)=>`<div class="dua-card"><div class="dua-title">${toEnglish(i+1)}. ${d.title} <span class="tag">${d.category||"عام"}</span></div><div class="dua-text">${d.text}</div></div>`).join("")}
addDuaBtn.onclick=()=>{let title=duaTitle.value.trim()||"دعاء جديد",category=duaCategory.value.trim()||"خاص",text=duaText.value.trim();if(!text){alert("اكتب نص الدعاء أولاً");return}let custom=JSON.parse(localStorage.getItem("customDuas")||"[]");custom.unshift({title,category,text});localStorage.setItem("customDuas",JSON.stringify(custom));duaTitle.value=duaCategory.value=duaText.value="";renderDuas()}
duaSearch.oninput=renderDuas;
async function refreshAll(){
  try{ cityPill.textContent=selectedCity.label || "الدوحة"; }catch(e){}
  try{ updateClockSun(); }catch(e){ console.warn("Clock/Sun failed", e); }
  try{ updateQibla(); }catch(e){ console.warn("Qibla failed", e); }
  try{ await loadPrayer(); }catch(e){ console.warn("Prayer failed", e); }
  try{ await loadWeather(); }catch(e){ console.warn("Weather failed", e); }
}
initTabs();initCity();initSettings();applyDark();updateAlertUI();renderAdhkar();renderDuas();refreshAll();setInterval(updateClockSun,1000);setInterval(loadWeather,20*60*1000);setInterval(loadPrayer,60*60*1000);



/* ===== Trip / Location Weather Check V6 ===== */
function tripWeatherCodeToArabic(code){
  return ({
    0:"سماء صافية",1:"غالباً صافي",2:"غائم جزئياً",3:"غائم",
    45:"ضباب",48:"ضباب كثيف",51:"رذاذ خفيف",53:"رذاذ متوسط",55:"رذاذ كثيف",
    61:"مطر خفيف",63:"مطر متوسط",65:"مطر غزير",
    80:"زخات خفيفة",81:"زخات متوسطة",82:"زخات قوية",
    95:"عواصف رعدية",96:"عواصف مع برد خفيف",99:"عواصف مع برد قوي"
  })[Number(code)] || "حالة طقس غير معروفة";
}

function buildTripDecision(weather){
  const temp = Number(weather.temperature_2m || 0);
  const apparent = Number(weather.apparent_temperature || temp);
  const wind = Number(weather.wind_speed_10m || 0);
  const gusts = Number(weather.wind_gusts_10m || 0);
  const humidity = Number(weather.relative_humidity_2m || 0);
  const rain = Number(weather.precipitation || 0);
  const code = Number(weather.weather_code || 0);

  let score = 100;
  let reasons = [];

  if (rain > 0 || [61,63,65,80,81,82,95,96,99].includes(code)) {
    score -= 35;
    reasons.push("في احتمال مطر أو زخات، وهذا قد يزعج الرحلة والشوي.");
  }

  if (wind >= 35 || gusts >= 45) {
    score -= 35;
    reasons.push("الرياح قوية وقد تكون مزعجة للشوي أو الجلسة الخارجية.");
  } else if (wind >= 22 || gusts >= 32) {
    score -= 18;
    reasons.push("الرياح متوسطة إلى قوية، اختَر مكان محمي وانتبه للنار.");
  }

  if (apparent >= 39) {
    score -= 30;
    reasons.push("الإحساس بالحرارة عالي جدًا، الأفضل تجنب وقت الظهيرة.");
  } else if (apparent >= 34) {
    score -= 16;
    reasons.push("الجو حار نسبيًا، الأفضل الخروج بعد العصر أو المغرب.");
  }

  if (humidity >= 75 && apparent >= 32) {
    score -= 14;
    reasons.push("الرطوبة عالية مع حرارة، الجلسة قد تكون متعبة.");
  }

  if (temp < 10) {
    score -= 10;
    reasons.push("الجو بارد نسبيًا، خذ احتياطك بالملابس.");
  }

  if (reasons.length === 0) {
    reasons.push("الجو مناسب عمومًا للرحلات والجلسات الخارجية.");
  }

  if (score >= 75) return {className:"trip-ok", title:"✅ مناسب للرحلة والشوي", score, reasons};
  if (score >= 50) return {className:"trip-mid", title:"⚠️ مناسب لكن مع احتياط", score, reasons};
  return {className:"trip-bad", title:"❌ غير مناسب حاليًا", score, reasons};
}

async function searchTripLocation(){
  const input = document.getElementById("tripSearchInput");
  const results = document.getElementById("tripResults");
  if(!input || !results) return;

  const query = input.value.trim();
  if(!query){
    alert("اكتب اسم المكان أولاً");
    return;
  }

  results.innerHTML = `<div class="dua-card"><div class="dua-title">جاري البحث...</div><div class="dua-text">نبحث عن الموقع ونفحص الطقس الآن.</div></div>`;

  try{
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ar&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if(!geoData.results || geoData.results.length === 0){
      results.innerHTML = `<div class="dua-card trip-bad"><div class="dua-title">لم يتم العثور على الموقع</div><div class="dua-text">جرّب كتابة الاسم بالإنجليزي أو أضف الدولة، مثال: Sealine Qatar أو Dukhan Qatar.</div></div>`;
      return;
    }

    const cards = [];
    for (const place of geoData.results.slice(0,3)){
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation&timezone=auto`;
      const wRes = await fetch(weatherUrl);
      const wData = await wRes.json();
      const w = wData.current;
      const decision = buildTripDecision(w);
      const safeName = String(place.name || "").replace(/'/g,"\\'");
      const placeName = `${place.name || ""}${place.admin1 ? " - " + place.admin1 : ""}${place.country ? " - " + place.country : ""}`;

      cards.push(`
        <div class="dua-card ${decision.className}">
          <div class="trip-decision">${decision.title}</div>
          <div class="dua-title">${placeName}</div>
          <div class="mini-grid">
            <div class="mini"><div>الحرارة</div><div>${toEnglish(Math.round(w.temperature_2m))}°C</div></div>
            <div class="mini"><div>الإحساس</div><div>${toEnglish(Math.round(w.apparent_temperature))}°C</div></div>
            <div class="mini"><div>الرطوبة</div><div>${toEnglish(w.relative_humidity_2m)}%</div></div>
            <div class="mini"><div>الرياح</div><div>${toEnglish(Math.round(w.wind_speed_10m))} كم/س</div></div>
            <div class="mini"><div>الهبات</div><div>${toEnglish(Math.round(w.wind_gusts_10m || 0))} كم/س</div></div>
            <div class="mini"><div>المطر</div><div>${toEnglish(w.precipitation || 0)} mm</div></div>
          </div>
          <div class="dua-text" style="margin-top:10px">
            <strong>الحالة:</strong> ${tripWeatherCodeToArabic(w.weather_code)}<br>
            <strong>التقييم:</strong> ${toEnglish(Math.max(0, Math.round(decision.score)))} / 100<br>
            <strong>الملاحظات:</strong><br>
            ${decision.reasons.map(r => "• " + r).join("<br>")}
          </div>
          <div class="dua-actions">
            <button class="small btn" onclick="selectTripAsCity('${safeName}', ${place.latitude}, ${place.longitude})">اعتمد هذا الموقع في التطبيق</button>
            <a class="small tab" style="text-decoration:none" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}">فتح في الخريطة</a>
        <button class="small btn"
          data-place="${htmlAttrSafe(placeName)}"
          data-temp="${htmlAttrSafe(Math.round(w.temperature_2m))}"
          data-apparent="${htmlAttrSafe(Math.round(w.apparent_temperature))}"
          data-wind="${htmlAttrSafe(Math.round(w.wind_speed_10m))}"
          data-gusts="${htmlAttrSafe(Math.round(w.wind_gusts_10m || 0))}"
          data-rain="${htmlAttrSafe(w.precipitation || 0)}"
          data-title="${htmlAttrSafe(decision.title)}"
          data-score="${htmlAttrSafe(Math.max(0, Math.round(decision.score)))}"
          data-notes="${htmlAttrSafe(decision.reasons.join('\n'))}"
          onclick="shareTripFromButton(this)">📲 إرسال النتيجة واتساب</button>
        <button class="small btn" onclick="shareToWhatsApp('🧺 فحص الرحلة والشوي متاح داخل التطبيق. افتح التطبيق لمشاهدة التفاصيل.')">📲 إرسال واتساب</button>
          </div>
        </div>
      `);
    }

    results.innerHTML = cards.join("");
  }catch(e){
    results.innerHTML = `<div class="dua-card trip-bad"><div class="dua-title">تعذر جلب البيانات</div><div class="dua-text">تأكد من الإنترنت وحاول مرة ثانية.</div></div>`;
  }
}

async function selectTripAsCity(name, lat, lng){
  selectedCity = {name:name, label:name, lat:Number(lat), lng:Number(lng), tz:3};
  localStorage.setItem("selectedCity", JSON.stringify(selectedCity));
  if(typeof refreshAll === "function") await refreshAll();
  alert("تم اعتماد الموقع داخل التطبيق");
}

setTimeout(()=>{
  const btn = document.getElementById("tripSearchButton");
  const input = document.getElementById("tripSearchInput");
  if(btn) btn.addEventListener("click", searchTripLocation);
  if(input) input.addEventListener("keydown", (e)=>{ if(e.key === "Enter") searchTripLocation(); });
}, 500);



/* ===== V8 Auto Cache Refresh Button ===== */
async function forceUpdateApp(){
  try{
    const btn = document.getElementById("forceUpdateButton");
    if(btn) btn.textContent = "⏳ جاري التحديث...";

    if("caches" in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    if("serviceWorker" in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.update()));
    }

    const cleanUrl = window.location.origin + window.location.pathname + "?v=" + Date.now();
    window.location.replace(cleanUrl);
  }catch(e){
    window.location.reload(true);
  }
}

setTimeout(()=>{
  const btn = document.getElementById("forceUpdateButton");
  if(btn) btn.addEventListener("click", forceUpdateApp);
}, 500);



/* ===== V8 Default Doha Reset Helper ===== */
async function resetToDoha(){
  selectedCity = {name:"الدوحة - قطر", label:"الدوحة", country:"Qatar", lat:25.2854, lng:51.5310, tz:3};
  localStorage.setItem("selectedCity", JSON.stringify(selectedCity));
  const citySelect = document.getElementById("citySelect");
  if(citySelect) citySelect.value = "0";
  if(typeof refreshAll === "function") await refreshAll();
  alert("تمت العودة إلى الدوحة");
}



/* ===== V9 Better Location Search with Qatar Places Fallback ===== */
const QATAR_KNOWN_PLACES = [
  {name:"سيلين", aliases:["سيلين","sealine","seal line","sealine beach","sealine qatar"], country:"Qatar", admin1:"Al Wakrah", latitude:24.8570, longitude:51.5150},
  {name:"خور العديد", aliases:["خور العديد","khor al adaid","inland sea","inland sea qatar"], country:"Qatar", admin1:"Al Wakrah", latitude:24.6300, longitude:51.3200},
  {name:"زكريت", aliases:["زكريت","zekreet","zekrit","zekreet qatar"], country:"Qatar", admin1:"Al Rayyan", latitude:25.4840, longitude:50.8460},
  {name:"دخان", aliases:["دخان","dukhan","dukhan qatar"], country:"Qatar", admin1:"Al Rayyan", latitude:25.4292, longitude:50.7850},
  {name:"الخور", aliases:["الخور","alkhor","al khor","al khor qatar"], country:"Qatar", admin1:"Al Khor", latitude:25.6804, longitude:51.4969},
  {name:"الذخيرة", aliases:["الذخيرة","al thakhira","thakhira","al dhakhira"], country:"Qatar", admin1:"Al Khor", latitude:25.7350, longitude:51.5350},
  {name:"الشمال", aliases:["الشمال","al shamal","ruwais","al ruwais"], country:"Qatar", admin1:"Madinat ash Shamal", latitude:26.1293, longitude:51.2009},
  {name:"أم باب", aliases:["ام باب","أم باب","umm bab","umbab"], country:"Qatar", admin1:"Al Rayyan", latitude:25.2140, longitude:50.8070},
  {name:"روضة راشد", aliases:["روضة راشد","rawdat rashid"], country:"Qatar", admin1:"Al Rayyan", latitude:25.1800, longitude:51.0900},
  {name:"الغارية", aliases:["الغارية","al ghariya","ghariya"], country:"Qatar", admin1:"Al Shamal", latitude:26.0500, longitude:51.3600},
  {name:"فويرط", aliases:["فويرط","fuwairit","fuwairit beach"], country:"Qatar", admin1:"Al Shamal", latitude:26.0300, longitude:51.3700},
  {name:"سميسمة", aliases:["سميسمة","simaisma","sumaysimah"], country:"Qatar", admin1:"Al Daayen", latitude:25.5760, longitude:51.4860},
  {name:"لوسيل", aliases:["لوسيل","lusail","lusail qatar"], country:"Qatar", admin1:"Al Daayen", latitude:25.4200, longitude:51.5200},
  {name:"الوكرة", aliases:["الوكرة","wakra","al wakrah","al wakra"], country:"Qatar", admin1:"Al Wakrah", latitude:25.1715, longitude:51.6034},
  {name:"الدوحة", aliases:["الدوحة","doha","doha qatar"], country:"Qatar", admin1:"Doha", latitude:25.2854, longitude:51.5310}
];

function normalizePlaceText(text){
  return String(text || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function findKnownQatarPlaces(query){
  const q = normalizePlaceText(query);
  if(!q) return [];
  return QATAR_KNOWN_PLACES.filter(p =>
    p.aliases.some(a => normalizePlaceText(a).includes(q) || q.includes(normalizePlaceText(a)))
  );
}

async function getWeatherForTripPlace(place){
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation&timezone=auto`;
  const wRes = await fetch(weatherUrl);
  const wData = await wRes.json();
  return wData.current;
}

function renderTripCard(place, w){
  const decision = buildTripDecision(w);
  const safeName = String(place.name || "").replace(/'/g,"\\'");
  const placeName = `${place.name || ""}${place.admin1 ? " - " + place.admin1 : ""}${place.country ? " - " + place.country : ""}`;

  return `
    <div class="dua-card ${decision.className}">
      <div class="trip-decision">${decision.title}</div>
      <div class="dua-title">${placeName}</div>
      <div class="mini-grid">
        <div class="mini"><div>الحرارة</div><div>${toEnglish(Math.round(w.temperature_2m))}°C</div></div>
        <div class="mini"><div>الإحساس</div><div>${toEnglish(Math.round(w.apparent_temperature))}°C</div></div>
        <div class="mini"><div>الرطوبة</div><div>${toEnglish(w.relative_humidity_2m)}%</div></div>
        <div class="mini"><div>الرياح</div><div>${toEnglish(Math.round(w.wind_speed_10m))} كم/س</div></div>
        <div class="mini"><div>الهبات</div><div>${toEnglish(Math.round(w.wind_gusts_10m || 0))} كم/س</div></div>
        <div class="mini"><div>المطر</div><div>${toEnglish(w.precipitation || 0)} mm</div></div>
      </div>
      <div class="dua-text" style="margin-top:10px">
        <strong>الحالة:</strong> ${tripWeatherCodeToArabic(w.weather_code)}<br>
        <strong>التقييم:</strong> ${toEnglish(Math.max(0, Math.round(decision.score)))} / 100<br>
        <strong>الملاحظات:</strong><br>
        ${decision.reasons.map(r => "• " + r).join("<br>")}
      </div>
      <div class="dua-actions">
        <button class="small btn" onclick="selectTripAsCity('${safeName}', ${place.latitude}, ${place.longitude}, '${place.country || ""}')">اعتمد هذا الموقع في التطبيق</button>
        <a class="small tab" style="text-decoration:none" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}">فتح في الخريطة</a>
        <button class="small btn"
          data-place="${htmlAttrSafe(placeName)}"
          data-temp="${htmlAttrSafe(Math.round(w.temperature_2m))}"
          data-apparent="${htmlAttrSafe(Math.round(w.apparent_temperature))}"
          data-wind="${htmlAttrSafe(Math.round(w.wind_speed_10m))}"
          data-gusts="${htmlAttrSafe(Math.round(w.wind_gusts_10m || 0))}"
          data-rain="${htmlAttrSafe(w.precipitation || 0)}"
          data-title="${htmlAttrSafe(decision.title)}"
          data-score="${htmlAttrSafe(Math.max(0, Math.round(decision.score)))}"
          data-notes="${htmlAttrSafe(decision.reasons.join('\n'))}"
          onclick="shareTripFromButton(this)">📲 إرسال النتيجة واتساب</button>
        <button class="small btn" onclick="shareToWhatsApp('🧺 فحص الرحلة والشوي متاح داخل التطبيق. افتح التطبيق لمشاهدة التفاصيل.')">📲 إرسال واتساب</button>
      </div>
    </div>
  `;
}

async function searchTripLocationV9(){
  const input = document.getElementById("tripSearchInput");
  const results = document.getElementById("tripResults");
  if(!input || !results) return;

  const query = input.value.trim();
  if(!query){
    alert("اكتب اسم المكان أولاً");
    return;
  }

  results.innerHTML = `<div class="dua-card"><div class="dua-title">جاري البحث...</div><div class="dua-text">نبحث عن الموقع ونفحص الطقس الآن.</div></div>`;

  try{
    let places = [];

    const known = findKnownQatarPlaces(query);
    if(known.length > 0){
      places = known;
    } else {
      const searchQueries = [query, `${query} Qatar`];
      for(const q of searchQueries){
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=ar&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if(geoData.results && geoData.results.length > 0){
          places = geoData.results.map(p => ({
            name:p.name,
            country:p.country,
            admin1:p.admin1,
            latitude:p.latitude,
            longitude:p.longitude
          }));
          break;
        }
      }
    }

    if(!places || places.length === 0){
      results.innerHTML = `<div class="dua-card trip-bad"><div class="dua-title">لم يتم العثور على الموقع</div><div class="dua-text">جرّب كتابة الاسم بطريقة أخرى، مثال: سيلين، Sealine Qatar، زكريت، Dukhan Qatar.</div></div>`;
      return;
    }

    const cards = [];
    for(const place of places.slice(0,3)){
      const w = await getWeatherForTripPlace(place);
      cards.push(renderTripCard(place, w));
    }

    results.innerHTML = cards.join("");
  }catch(e){
    results.innerHTML = `<div class="dua-card trip-bad"><div class="dua-title">تعذر جلب البيانات</div><div class="dua-text">تأكد من الإنترنت وحاول مرة ثانية.</div></div>`;
  }
}

async function selectTripAsCity(name, lat, lng, country){
  selectedCity = {name:name, label:name, country:country || "", lat:Number(lat), lng:Number(lng), tz:3};
  localStorage.setItem("selectedCity", JSON.stringify(selectedCity));
  if(typeof refreshAll === "function") await refreshAll();
  alert("تم اعتماد الموقع داخل التطبيق");
}

setTimeout(()=>{
  const btn = document.getElementById("tripSearchButton");
  const input = document.getElementById("tripSearchInput");
  if(btn){
    btn.replaceWith(btn.cloneNode(true));
    const newBtn = document.getElementById("tripSearchButton");
    newBtn.addEventListener("click", searchTripLocationV9);
  }
  if(input){
    input.addEventListener("keydown", (e)=>{ if(e.key === "Enter") searchTripLocationV9(); });
  }
}, 800);



/* ===== V16 Local WhatsApp Share Buttons ===== */
function shareToWhatsApp(message){
  safeOpenExternal("https://wa.me/?text=" + encodeURIComponent(message));
}

function getTextSafe(id){
  const x = document.getElementById(id);
  return x ? x.textContent.trim() : "--";
}

function shareMainWeatherWhatsApp(){
  const city = (selectedCity && selectedCity.label) ? selectedCity.label : getTextSafe("cityPill");
  const msg =
`🌤️ حالة الطقس الآن

الموقع: ${city}
الحالة: ${getTextSafe("weatherDescription")}
الحرارة: ${getTextSafe("temperature")}
الإحساس: ${getTextSafe("apparentTemp")}
الرطوبة: ${getTextSafe("humidity")}
الرياح: ${getTextSafe("windSpeed")}
المطر: ${getTextSafe("precipitation")}
آخر تحديث: ${getTextSafe("weatherTime")}

تم الإرسال من تطبيق أحمد المحاميد.`;
  shareToWhatsApp(msg);
}

setTimeout(()=>{
  const wBtn = document.getElementById("shareWeatherButton");
  if(wBtn) wBtn.addEventListener("click", shareMainWeatherWhatsApp);
}, 800);



function shareTripResultWhatsApp(placeName, temp, apparent, wind, gusts, rain, decisionTitle, score, notes){
  const msg =
`🧺 فحص الرحلة والشوي

المكان: ${placeName}
النتيجة: ${decisionTitle}
التقييم: ${score}/100

الحرارة: ${temp}°C
الإحساس: ${apparent}°C
الرياح: ${wind} كم/س
الهبات: ${gusts} كم/س
المطر: ${rain} mm

الملاحظات:
${notes}

تم الإرسال من تطبيق أحمد المحاميد.`;
  shareToWhatsApp(msg);
}


/* ===== V17 Security Clean Helpers ===== */
function safeOpenExternal(url){
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if(w) w.opener = null;
}



/* ===== V18 Stable Permissions + Terms ===== */
const APP_TERMS_KEY = "ahmadApp_termsAccepted_v18";

function openTermsModal(){
  const modal = document.getElementById("termsModal");
  if(modal) modal.style.display = "flex";
}

function closeTermsModal(){
  const modal = document.getElementById("termsModal");
  if(modal) modal.style.display = "none";
}

function acceptTerms(){
  const check = document.getElementById("termsAcceptCheck");
  if(check && !check.checked){
    alert("يرجى وضع علامة الموافقة أولًا.");
    return;
  }
  localStorage.setItem(APP_TERMS_KEY, new Date().toISOString());
  closeTermsModal();
}

function showTermsIfNeeded(){
  if(!localStorage.getItem(APP_TERMS_KEY)){
    setTimeout(openTermsModal, 700);
  }
}

async function requestAppPermissions(){
  let messages = [];
  try{
    if("geolocation" in navigator){
      await new Promise((resolve)=>{
        navigator.geolocation.getCurrentPosition(
          (pos)=>{
            messages.push("✅ تم السماح بالموقع.");
            resolve(pos);
          },
          ()=>{
            messages.push("⚠️ لم يتم السماح بالموقع أو تعذر تحديده.");
            resolve(null);
          },
          {enableHighAccuracy:true, timeout:12000, maximumAge:0}
        );
      });
    } else {
      messages.push("⚠️ الموقع غير مدعوم في هذا المتصفح.");
    }
  }catch(e){
    messages.push("⚠️ تعذر طلب صلاحية الموقع.");
  }

  try{
    if("Notification" in window){
      if(Notification.permission === "granted"){
        messages.push("✅ التنبيهات مفعلة مسبقًا.");
      } else if(Notification.permission !== "denied"){
        const p = await Notification.requestPermission();
        messages.push(p === "granted" ? "✅ تم السماح بالتنبيهات." : "⚠️ لم يتم السماح بالتنبيهات.");
      } else {
        messages.push("⚠️ التنبيهات مرفوضة من إعدادات المتصفح.");
      }
    } else {
      messages.push("⚠️ التنبيهات غير مدعومة في هذا المتصفح.");
    }
  }catch(e){
    messages.push("⚠️ تعذر طلب صلاحية التنبيهات.");
  }

  alert(messages.join("\n"));
  if(typeof refreshAll === "function"){
    try{ await refreshAll(); }catch(e){}
  }
}

function resetTermsForTesting(){
  localStorage.removeItem(APP_TERMS_KEY);
  openTermsModal();
}

setTimeout(()=>{
  showTermsIfNeeded();
  const btn = document.getElementById("permissionsButton");
  if(btn) btn.addEventListener("click", requestAppPermissions);
  const termsBtn = document.getElementById("openTermsButton");
  if(termsBtn) termsBtn.addEventListener("click", openTermsModal);
  const acceptBtn = document.getElementById("acceptTermsButton");
  if(acceptBtn) acceptBtn.addEventListener("click", acceptTerms);
}, 800);



/* ===== V20 Safe Trip WhatsApp Share ===== */
function htmlAttrSafe(v){
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shareTripFromButton(btn){
  const msg =
`🧺 فحص الرحلة والشوي

المكان: ${btn.dataset.place || "--"}
النتيجة: ${btn.dataset.title || "--"}
التقييم: ${btn.dataset.score || "--"}/100

الحرارة: ${btn.dataset.temp || "--"}°C
الإحساس: ${btn.dataset.apparent || "--"}°C
الرياح: ${btn.dataset.wind || "--"} كم/س
الهبات: ${btn.dataset.gusts || "--"} كم/س
المطر: ${btn.dataset.rain || "--"} mm

الملاحظات:
${btn.dataset.notes || "--"}

تم الإرسال من تطبيق أحمد المحاميد.`;
  shareToWhatsApp(msg);
}
