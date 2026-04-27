const LAT = 25.2854;
const LNG = 51.5310;
const TIMEZONE = 3; // Qatar UTC+3

let deferredPrompt;
const installButton = document.getElementById("installButton");

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

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function toDegrees(rad) {
  return rad * 180 / Math.PI;
}

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
  const lngHour = LNG / 15;
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

  const cosH = (Math.cos(toRadians(zenith)) - (sinDec * Math.sin(toRadians(LAT)))) / (cosDec * Math.cos(toRadians(LAT)));

  if (cosH > 1 || cosH < -1) return null;

  let H = isSunrise ? 360 - toDegrees(Math.acos(cosH)) : toDegrees(Math.acos(cosH));
  H = H / 15;

  const T = H + RA - (0.06571 * t) - 6.622;
  const UT = normalize24(T - lngHour);

  return normalize24(UT + TIMEZONE);
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

function formatDate(date) {
  return date.toLocaleDateString("ar-QA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h} ساعة ${m} دقيقة ${s} ثانية`;
}

function updateApp() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const srToday = decimalToDate(today, calculateSunTime(today, true));
  const ssToday = decimalToDate(today, calculateSunTime(today, false));
  const srTomorrow = decimalToDate(tomorrow, calculateSunTime(tomorrow, true));
  const ssTomorrow = decimalToDate(tomorrow, calculateSunTime(tomorrow, false));

  document.getElementById("currentTime").textContent = formatTime(now);
  document.getElementById("currentDate").textContent = formatDate(now);

  document.getElementById("sunriseToday").textContent = formatTime(srToday);
  document.getElementById("sunsetToday").textContent = formatTime(ssToday);
  document.getElementById("dayLengthToday").textContent = formatDuration(ssToday - srToday);

  document.getElementById("sunriseTomorrow").textContent = formatTime(srTomorrow);
  document.getElementById("sunsetTomorrow").textContent = formatTime(ssTomorrow);
  document.getElementById("dayLengthTomorrow").textContent = formatDuration(ssTomorrow - srTomorrow);
}

updateApp();
setInterval(updateApp, 1000);
