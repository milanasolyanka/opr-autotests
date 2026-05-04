// k6 run load-testing.js

import http from "k6/http";
import { sleep, check } from "k6";

// ============================
// НАСТРОЙКИ
// ============================
export const options = {
  scenarios: {
    spike_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "20s", target: 100 },
        { duration: "10s", target: 0 },
        { duration: "10s", target: 100 },
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

// ОБЩИЕ БАНДЛЫ (почти всегда)
const COMMON_BUNDLES = [
  "/tilda-polyfill-1.0.min.js",
  "/jquery-1.10.2.min.js",
  "/tilda-scripts-3.0.min.js",
  "/lazyload-1.3.min.export.js",
  "/tilda-animation-2.0.min.js",
  "/tilda-zero-1.1.min.js",
  "/tilda-events-1.0.min.js",
  "/tilda-stat-1.0.min.js",
  "/owl.carousel.min.js",
];

// PAGE-SPECIFIC
const PAGE_BUNDLES = {
  "/": ["/tilda-blocks-page20348027.min.js?t=1775642794"],
  "/tutors": ["/tilda-blocks-page20627263.min.js?t=1775642794"],
  "/marathons": ["/tilda-blocks-page20627263.min.js?t=1775642794"],
  "/schools": ["/tilda-blocks-page20627263.min.js?t=1775642794"],
  "/pricing": ["/tilda-blocks-page20627263.min.js?t=1775642794"],
  "/contacts": ["/tilda-blocks-page20627263.min.js?t=1775642794"],
  "/terms": ["/tilda-blocks-page21620967.min.js?t=1775642797"],
};

// ТЯЖЁЛЫЕ (cold load)
const HEAVY_BUNDLES = [
  "/index.c41cd897.js",
  "/3295.ae78d9b9.js",
  "/9265.2eef8f44.js",
];

// ============================
// ОСНОВНОЙ СЦЕНАРИЙ
// ============================
export default function () {
  const headers = {
    "Cache-Control": "no-cache",
  };

  // ============================
  // 1. ХАОТИЧНЫЙ ПУТЬ
  // ============================
  const page = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${BASE_URL}${page}`, { headers });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "html not empty": (r) => r.body && r.body.length > 1000,
  });

  sleep(Math.random() * 2 + 1);

  // ============================
  // 2. ОБЩИЕ БАНДЛЫ
  // ============================
  if (Math.random() < 0.7) {
    COMMON_BUNDLES.forEach((bundle) => {
      const r = http.get(`${BASE_URL}${bundle}`, {
        headers,
        tags: { type: "bundle", group: "common" },
      });

      check(r, {
        "common bundle ok": (res) => res.status === 200,
      });
    });
  }

  // ============================
  // 3. PAGE БАНДЛЫ
  // ============================
  if (PAGE_BUNDLES[page] && Math.random() < 0.6) {
    PAGE_BUNDLES[page].forEach((bundle) => {
      const r = http.get(`${BASE_URL}${bundle}`, {
        headers,
        tags: { type: "bundle", group: "page" },
      });

      check(r, {
        "page bundle ok": (res) => res.status === 200,
      });
    });
  }

  // ============================
  // 4. ТЯЖЁЛЫЕ БАНДЛЫ (редко)
  // ============================
  if (Math.random() < 0.2) {
    HEAVY_BUNDLES.forEach((bundle) => {
      const r = http.get(`${BASE_URL}${bundle}`, {
        headers,
        tags: { type: "bundle", group: "heavy" },
      });

      check(r, {
        "heavy bundle ok": (res) => res.status === 200,
      });
    });
  }

  // ============================
  // 5. ВИДЕО
  // ============================
  if (Math.random() < 0.3) {
    const videoRes = http.get(`${BASE_URL}/schools#showdemo`, {
      headers,
    });

    check(videoRes, {
      "video page loaded": (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 2 + 1);
}
