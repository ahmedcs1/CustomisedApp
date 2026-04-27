const CITIES = [
  { name: "الدوحة - قطر", label: "الدوحة", country: "Qatar", lat: 25.2854, lng: 51.5310, tz: 3 },
  { name: "عمّان - الأردن", label: "عمّان", country: "Jordan", lat: 31.9539, lng: 35.9106, tz: 3 },
  { name: "معان - الأردن", label: "معان", country: "Jordan", lat: 30.1962, lng: 35.7341, tz: 3 },
  { name: "الكرك - الأردن", label: "الكرك", country: "Jordan", lat: 31.1853, lng: 35.7047, tz: 3 },
  { name: "القدس - فلسطين", label: "القدس", country: "Palestine", lat: 31.7683, lng: 35.2137, tz: 3 },
  { name: "مكة المكرمة - السعودية", label: "مكة", country: "Saudi Arabia", lat: 21.3891, lng: 39.8579, tz: 3 },
  { name: "الرياض - السعودية", label: "الرياض", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753, tz: 3 },
  { name: "دبي - الإمارات", label: "دبي", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708, tz: 4 },
  { name: "لندن - بريطانيا", label: "لندن", country: "United Kingdom", lat: 51.5072, lng: -0.1276, tz: 1 },
  { name: "إسطنبول - تركيا", label: "إسطنبول", country: "Turkey", lat: 41.0082, lng: 28.9784, tz: 3 }
];

const KAABA = { lat: 21.422487, lng: 39.826206 };

let selectedCity = JSON.parse(localStorage.getItem("selectedCity")) || CITIES[0];
let alertsEnabled = localStorage.getItem("alertsEnabled") === "true";
let darkMode = localStorage.getItem("darkMode") === "true";
let alertSettings = JSON.parse(localStorage.getItem("alertSettings")) || {
  before: true,
  atTime: true,
  prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }
};
let prayerTimes = {};
let alertTimers = [];
let deferredPrompt;
let qiblaBearing = 0;

const el = (id) => document.getElementById(id);

const citySelect = el("citySelect");
const installButton = el("installButton");
const darkModeButton = el("darkModeButton");
const alertButton = el("alertButton");
const gpsButton = el("gpsButton");
const compassButton = el("compassButton");
const testSoundButton = el("testSoundButton");

function initCitySelect() {
  citySelect.innerHTML = "";
  CITIES.forEach((city, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = city.name;
    if (city.label === selectedCity.label && city.lat === selectedCity.lat) opt.selected = true;
    citySelect.appendChild(opt);
  });

  citySelect.addEventListener("change", async () => {
    selectedCity = CITIES[Number(citySelect.value)];
    localStorage.setItem("selectedCity", JSON.stringify(selectedCity));
    await refreshAll();
  });
}

function applyDarkMode() {
  document.body.classList.toggle("dark", darkMode);
  darkModeButton.textContent = darkMode ? "☀️ الوضع الفاتح" : "🌙 الوضع الداكن";
}

darkModeButton.addEventListener("click", () => {
  darkMode = !darkMode;
  localStorage.setItem("darkMode", String(darkMode));
  applyDarkMode();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.style.display = "block";
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.style.display = "none";
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

function toRadians(deg) { return deg * Math.PI / 180; }
function toDegrees(rad) { return rad * 180 / Math.PI; }

function dayOfYear(date) {
  const start = new Date(Date.UTC(date.getFullYear(), 0, 0));
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86400000);
}

function normalize360(value) {
  value = value % 360;
  return value < 0 ? value + 360 : value;
}

function normalize24(value) {
  value = value % 24;
  return value < 0 ? value + 24 : value;
}

function calculateSunTime(date, isSunrise) {
  const zenith = 90.833;
  const N = dayOfYear(date);
  const lngHour = selectedCity.lng / 15;
  const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;

  const M = (0.9856 * t) - 3.289;
  let L = M + (1.916 * Math.sin(toRadians(M))) + (0.020 * Math.sin(toRadians(2 * M))) + 282.634;
  L = normalize360(L);

  let RA = toDegrees(Math.atan(0.91764 * Math.tan(toRadians(L))));
  RA = normalize360(RA);

  const Lquadrant = Math.floor(L / 90) * 90;
  const RAquadrant = Math.floor(RA / 90) * 90;
  RA = (RA + (Lquadrant - RAquadrant)) / 15;

  const sinDec = 0.39782 * Math.sin(toRadians(L));
  const cosDec = Math.cos(Math.asin(sinDec));

  const cosH = (Math.cos(toRadians(zenith)) - (sinDec * Math.sin(toRadians(selectedCity.lat)))) / (cosDec * Math.cos(toRadians(selectedCity.lat)));
  if (cosH > 1 || cosH < -1) return null;

  let H = isSunrise ? 360 - toDegrees(Math.acos(cosH)) : toDegrees(Math.acos(cosH));
  H = H / 15;

  const T = H + RA - (0.06571 * t) - 6.622;
  const UT = normalize24(T - lngHour);
  return normalize24(UT + selectedCity.tz);
}

function decimalToDate(date, decimalHour) {
  const hours = Math.floor(decimalHour);
  const minutesFloat = (decimalHour - hours) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds);
}

function formatTime(date) {
  return date.toLocaleTimeString("ar-QA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function formatShortTime(timeText) {
  if (!timeText) return "--";
  return String(timeText).replace(/\s?\(.+\)/, "").trim();
}

function formatDate(date) {
  return date.toLocaleDateString("ar-QA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatHijri(date) {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  } catch {
    return "--";
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h} ساعة ${m} دقيقة ${s} ثانية`;
}

function updateClockAndSun() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const srToday = decimalToDate(today, calculateSunTime(today, true));
  const ssToday = decimalToDate(today, calculateSunTime(today, false));
  const srTomorrow = decimalToDate(tomorrow, calculateSunTime(tomorrow, true));
  const ssTomorrow = decimalToDate(tomorrow, calculateSunTime(tomorrow, false));

  el("currentTime").textContent = formatTime(now);
  el("currentDate").textContent = formatDate(now);
  el("hijriDate").textContent = formatHijri(now);
  el("sunriseToday").textContent = formatTime(srToday);
  el("sunsetToday").textContent = formatTime(ssToday);
  el("dayLengthToday").textContent = formatDuration(ssToday - srToday);
  el("sunriseTomorrow").textContent = formatTime(srTomorrow);
  el("sunsetTomorrow").textContent = formatTime(ssTomorrow);
}

async function loadPrayerTimes() {
  try {
    const today = new Date();
    const url = `https://api.aladhan.com/v1/timings/${Math.floor(today.getTime() / 1000)}?latitude=${selectedCity.lat}&longitude=${selectedCity.lng}&method=4`;
    const res = await fetch(url);
    const data = await res.json();
    const timings = data.data.timings;

    prayerTimes = {
      Fajr: formatShortTime(timings.Fajr),
      Sunrise: formatShortTime(timings.Sunrise),
      Dhuhr: formatShortTime(timings.Dhuhr),
      Asr: formatShortTime(timings.Asr),
      Maghrib: formatShortTime(timings.Maghrib),
      Isha: formatShortTime(timings.Isha)
    };

    el("fajr").textContent = prayerTimes.Fajr;
    el("sunrisePrayer").textContent = prayerTimes.Sunrise;
    el("dhuhr").textContent = prayerTimes.Dhuhr;
    el("asr").textContent = prayerTimes.Asr;
    el("maghrib").textContent = prayerTimes.Maghrib;
    el("isha").textContent = prayerTimes.Isha;
    el("prayerSource").textContent = selectedCity.label;

    schedulePrayerAlerts();
  } catch {
    el("prayerSource").textContent = "تعذر التحديث";
  }
}

function weatherCodeToArabic(code) {
  const map = {
    0: "سماء صافية", 1: "غالباً صافي", 2: "غائم جزئياً", 3: "غائم",
    45: "ضباب", 48: "ضباب كثيف", 51: "رذاذ خفيف", 53: "رذاذ متوسط",
    55: "رذاذ كثيف", 61: "مطر خفيف", 63: "مطر متوسط", 65: "مطر غزير",
    71: "ثلج خفيف", 80: "زخات خفيفة", 81: "زخات متوسطة", 82: "زخات قوية",
    95: "عواصف رعدية"
  };
  return map[code] || "حالة طقس غير معروفة";
}

async function loadWeather() {
  try {
    el("weatherStatus").textContent = "مباشر";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    el("temperature").textContent = `${Math.round(data.current.temperature_2m)}°C`;
    el("weatherDescription").textContent = weatherCodeToArabic(data.current.weather_code);
    el("windSpeed").textContent = `${Math.round(data.current.wind_speed_10m)} كم/س`;
    el("weatherTime").textContent = data.current.time ? data.current.time.replace("T", " ") : "--";
  } catch {
    el("weatherStatus").textContent = "غير متاح";
    el("weatherDescription").textContent = "تعذر جلب الطقس حالياً";
  }
}

function prayerTimeToDate(timeText) {
  const [h, m] = timeText.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function playAlertSound() {
  const audio = new Audio("adhan.mp3");
  audio.play().catch(() => beepFallback());
}

function beepFallback() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 800);
  } catch {}
}

async function toggleAlerts() {
  if (!("Notification" in window)) {
    alert("جهازك أو المتصفح لا يدعم التنبيهات.");
    return;
  }

  if (!alertsEnabled) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("لازم تسمح للتنبيهات من المتصفح أولاً.");
      return;
    }
    alertsEnabled = true;
  } else {
    alertsEnabled = false;
  }

  localStorage.setItem("alertsEnabled", String(alertsEnabled));
  updateAlertUI();
  schedulePrayerAlerts();
}

function updateAlertUI() {
  alertButton.textContent = alertsEnabled ? "🔕 إيقاف التنبيهات" : "🔔 تشغيل التنبيهات";
  el("alertStatus").textContent = alertsEnabled ? "مفعلة" : "متوقفة";
  el("alertStatus").className = alertsEnabled ? "alert-on" : "alert-off";
}

function clearAlertTimers() {
  alertTimers.forEach(clearTimeout);
  alertTimers = [];
}

function showNotification(title, body) {
  playAlertSound();
  new Notification(title, { body, icon: "icon.svg" });
}

function schedulePrayerAlerts() {
  clearAlertTimers();
  if (!alertsEnabled || !prayerTimes || Object.keys(prayerTimes).length === 0) return;

  const names = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };

  Object.keys(names).forEach((key) => {
    if (!alertSettings.prayers[key] || !prayerTimes[key]) return;

    const prayerDate = prayerTimeToDate(prayerTimes[key]);
    const now = new Date();

    if (alertSettings.before) {
      const beforeMs = prayerDate - now - (10 * 60 * 1000);
      if (beforeMs > 0) {
        alertTimers.push(setTimeout(() => {
          showNotification(`اقترب وقت صلاة ${names[key]}`, `باقي 10 دقائق - ${selectedCity.label}`);
        }, beforeMs));
      }
    }

    if (alertSettings.atTime) {
      const atMs = prayerDate - now;
      if (atMs > 0) {
        alertTimers.push(setTimeout(() => {
          showNotification(`حان وقت صلاة ${names[key]}`, `المدينة: ${selectedCity.label}`);
        }, atMs));
      }
    }
  });
}

alertButton.addEventListener("click", toggleAlerts);
testSoundButton.addEventListener("click", playAlertSound);

function initAlertSettings() {
  el("notifyBefore").checked = alertSettings.before;
  el("notifyAtTime").checked = alertSettings.atTime;

  el("notifyBefore").addEventListener("change", (e) => {
    alertSettings.before = e.target.checked;
    saveAlertSettings();
  });

  el("notifyAtTime").addEventListener("change", (e) => {
    alertSettings.atTime = e.target.checked;
    saveAlertSettings();
  });

  document.querySelectorAll(".prayer-toggle").forEach((input) => {
    input.checked = alertSettings.prayers[input.dataset.prayer];
    input.addEventListener("change", (e) => {
      alertSettings.prayers[e.target.dataset.prayer] = e.target.checked;
      saveAlertSettings();
    });
  });
}

function saveAlertSettings() {
  localStorage.setItem("alertSettings", JSON.stringify(alertSettings));
  schedulePrayerAlerts();
}

function getQiblaBearing(lat, lng) {
  const phi1 = toRadians(lat);
  const phi2 = toRadians(KAABA.lat);
  const deltaLng = toRadians(KAABA.lng - lng);
  const y = Math.sin(deltaLng);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLng);
  return normalize360(toDegrees(Math.atan2(y, x)));
}

function updateQibla(rotationOffset = 0) {
  qiblaBearing = getQiblaBearing(selectedCity.lat, selectedCity.lng);
  el("qiblaDegree").textContent = `${Math.round(qiblaBearing)}°`;
  el("qiblaNeedle").style.transform = `rotate(${qiblaBearing - rotationOffset}deg)`;
}

function enableCompass() {
  if (typeof DeviceOrientationEvent === "undefined") {
    el("compassNote").textContent = "البوصلة غير مدعومة على هذا المتصفح.";
    return;
  }

  const start = () => {
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    el("compassNote").textContent = "تم تشغيل البوصلة إذا كان جهازك يدعمها.";
  };

  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((state) => state === "granted" ? start() : el("compassNote").textContent = "لم يتم السماح باستخدام البوصلة.")
      .catch(() => el("compassNote").textContent = "تعذر تشغيل البوصلة.");
  } else {
    start();
  }
}

function handleOrientation(event) {
  const heading = event.webkitCompassHeading || (360 - event.alpha);
  if (typeof heading === "number" && !Number.isNaN(heading)) {
    updateQibla(heading);
  }
}

compassButton.addEventListener("click", enableCompass);

gpsButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("الموقع غير مدعوم على هذا الجهاز.");
    return;
  }

  gpsButton.textContent = "📍 جاري التحديد...";
  navigator.geolocation.getCurrentPosition(async (position) => {
    selectedCity = {
      name: "موقعي الحالي",
      label: "موقعي",
      country: "Current Location",
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      tz: 3
    };
    localStorage.setItem("selectedCity", JSON.stringify(selectedCity));
    citySelect.value = "";
    gpsButton.textContent = "📍 موقعي";
    await refreshAll();
  }, () => {
    gpsButton.textContent = "📍 موقعي";
    alert("تعذر تحديد الموقع. تأكد من السماح للموقع من المتصفح.");
  }, { enableHighAccuracy: true, timeout: 10000 });
});

async function refreshAll() {
  el("cityPill").textContent = selectedCity.label;
  updateClockAndSun();
  updateQibla();
  await Promise.all([loadPrayerTimes(), loadWeather()]);
}

initCitySelect();
initAlertSettings();
applyDarkMode();
updateAlertUI();
refreshAll();
setInterval(updateClockAndSun, 1000);
setInterval(loadWeather, 20 * 60 * 1000);
setInterval(loadPrayerTimes, 60 * 60 * 1000);
