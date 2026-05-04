// k6 run load-testing.js

import http from "k6/http";
import { sleep, check } from "k6";

// ============================
// НАСТРОЙКИ НАГРУЗКИ
// ============================
export const options = {
  scenarios: {
    spike_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 }, // резкий рост
        { duration: "20s", target: 100 }, // удержание
        { duration: "10s", target: 0 }, // спад
        { duration: "10s", target: 100 }, // снова пик
        { duration: "20s", target: 100 },
        { duration: "10s", target: 0 },
      ],
      gracefulStop: "10s",
    },
  },

  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

// ============================
// ДАННЫЕ
// ============================
const BASE_URL = "https://progressme.ru";

const pages = [
  "/",
  "/tutors",
  "/marathons",
  "/schools",
  "/pricing",
  "/contacts",
  "/publisher",
  "/replays",
  "/terms",
];

// ============================
// ОСНОВНОЙ СЦЕНАРИЙ
// ============================
export default function () {
  const headers = {
    "Cache-Control": "no-cache", // убиваем кэш
  };

  // ============================
  // ХАОТИЧНЫЙ ПУТЬ
  // ============================
  const page = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${BASE_URL}${page}`, { headers });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response not empty": (r) => r.body && r.body.length > 1000,
  });

  // ============================
  // СЦЕНАРИЙ С ВИДЕО
  // ============================
  if (Math.random() < 0.3) {
    const videoRes = http.get(`${BASE_URL}/schools#showdemo`, { headers });

    check(videoRes, {
      "video page loaded": (r) => r.status === 200,
    });

    sleep(Math.random() * 2 + 1);
  }

  // ============================
  // ДОП. НАГРУЗКА НА БАНДЛЫ
  // ============================
  if (Math.random() < 0.5) {
    http.get(`${BASE_URL}/static/js/main.js`, { headers });
  }

  sleep(Math.random() * 2 + 1);
}
