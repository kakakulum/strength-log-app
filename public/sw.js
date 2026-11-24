// 서비스 워커: 한 번 열어 본 화면과 정적 파일을 저장해 두어, 전파가 약한 헬스장에서도 앱이 열리게 한다.
// - 정적 파일(/_next/static, 아이콘): 저장된 것을 먼저 쓴다. (파일 이름에 해시가 있어 바뀌면 새 이름이다)
// - 그 밖의 화면: 네트워크를 먼저 시도하고, 실패하면 저장된 것을 쓴다. (배포한 새 화면이 바로 보이게)
// 운동 기록은 localStorage에 있어 이 파일과 무관하다. 기록을 서버로 보내거나 가져오지 않는다.
const CACHE = "strength-log-v2";
// 처음 열 때 미리 저장해 두는 화면. 앱 안에서 링크로 이동한 화면은 화면 전체(HTML)가 저장되지 않으므로,
// 오프라인에서 이동이 실패해도 열리도록 주요 화면을 미리 저장한다. (기록은 이 기기의 저장소에서 읽는다)
const PRECACHE = [
  "/",
  "/history",
  "/workout/setup",
  "/history/squat",
  "/history/bench-press",
  "/history/deadlift",
  "/history/lat-pulldown",
  "/history/leg-press",
  "/icon-192.png",
];

self.addEventListener("install", (event) => {
  // 하나가 실패해도 나머지는 저장한다. (addAll은 하나만 실패해도 전부 버린다)
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((url) => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || /^\/(icon-\d+|apple-touch-icon)\.png$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 다른 사이트 요청, 서비스 워커 자신, 개발용 페이지는 건드리지 않는다.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/dev/")) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/") : undefined) || Response.error()),
      ),
  );
});
