// 서비스 워커 동작 테스트: 가짜 저장소(caches)와 가짜 네트워크로 public/sw.js의 요청 처리 규칙을 확인한다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Handler = (event: { request: unknown; respondWith: (p: Promise<Response>) => void; waitUntil: (p: Promise<unknown>) => void }) => void;

function setup(online: boolean) {
  const store = new Map<string, Response>();
  const listeners: Record<string, Handler> = {};
  const fetched: string[] = [];
  const cache = {
    add: async (url: string) => {
      const abs = new URL(url, "https://app.test").href;
      store.set(abs, await fakeFetch({ url: abs }));
    },
    put: async (req: { url: string }, res: Response) => void store.set(req.url, res),
  };
  const fakeCaches = {
    open: async () => cache,
    match: async (req: { url: string } | string) => store.get(typeof req === "string" ? new URL(req, "https://app.test").href : req.url)?.clone(),
    keys: async () => ["strength-log-v1"],
    delete: async () => true,
  };
  const fakeSelf = {
    location: { origin: "https://app.test" },
    addEventListener: (type: string, fn: Handler) => void (listeners[type] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const fakeFetch = async (req: { url: string }) => {
    fetched.push(req.url);
    if (!online) throw new TypeError("offline");
    return new Response(`body:${req.url}`, { status: 200 });
  };
  const code = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
  new Function("self", "caches", "fetch", "Response", code)(fakeSelf, fakeCaches, fakeFetch, Response);

  // 요청을 보내 서비스 워커가 응답을 만들었는지(만들었으면 그 응답 본문) 돌려준다.
  async function request(path: string, init: { method?: string; mode?: string; origin?: string } = {}) {
    const req = { url: `${init.origin ?? "https://app.test"}${path}`, method: init.method ?? "GET", mode: init.mode ?? "same-origin" };
    let responded: Promise<Response> | null = null;
    listeners.fetch({ request: req, respondWith: (p) => void (responded = p), waitUntil: () => {} });
    if (!responded) return null;
    try {
      return await (responded as Promise<Response>).then((r) => r.text());
    } catch {
      return "ERROR";
    }
  }
  // 설치 단계(미리 저장)를 실행하고 끝날 때까지 기다린다.
  async function install() {
    let done: Promise<unknown> = Promise.resolve();
    listeners.install({ request: null, respondWith: () => {}, waitUntil: (p) => void (done = p) });
    await done;
  }
  return { request, fetched, store, install };
}

describe("서비스 워커", () => {
  it("온라인이면 화면을 네트워크에서 받아 저장하고, 오프라인이면 저장해 둔 것을 쓴다", async () => {
    const on = setup(true);
    expect(await on.request("/history", { mode: "navigate" })).toBe("body:https://app.test/history");
    expect(on.store.has("https://app.test/history")).toBe(true);

    // 같은 저장소에서 오프라인으로 바꾼 상황을 만든다.
    const off = setup(false);
    off.store.set("https://app.test/history", new Response("saved-history"));
    expect(await off.request("/history", { mode: "navigate" })).toBe("saved-history");
  });

  it("처음 열 때 주요 화면을 미리 저장해, 오프라인에서 기록·추세와 종목 상세가 열린다", async () => {
    const s = setup(true);
    await s.install();
    for (const path of ["/history", "/workout/setup", "/history/squat", "/history/leg-press"]) {
      expect(s.store.has(`https://app.test${path}`), path).toBe(true);
    }
    // 같은 저장소 내용으로 오프라인 상황을 만든다.
    const off = setup(false);
    for (const [k, v] of s.store) off.store.set(k, v.clone());
    expect(await off.request("/history", { mode: "navigate" })).toBe("body:https://app.test/history");
    expect(await off.request("/history/lat-pulldown", { mode: "navigate" })).toBe("body:https://app.test/history/lat-pulldown");
  });

  it("저장해 둔 적 없는 화면을 오프라인으로 열면 저장된 홈(/)을 보여준다", async () => {
    const off = setup(false);
    off.store.set("https://app.test/", new Response("saved-home"));
    expect(await off.request("/history/squat", { mode: "navigate" })).toBe("saved-home");
  });

  it("정적 파일은 저장된 것을 먼저 쓰고 네트워크를 부르지 않는다", async () => {
    const s = setup(true);
    s.store.set("https://app.test/_next/static/chunk.js", new Response("cached-chunk"));
    expect(await s.request("/_next/static/chunk.js")).toBe("cached-chunk");
    expect(s.fetched).toEqual([]);
  });

  it("오프라인이고 저장된 것도 없으면 오류로 끝난다 (빈 화면을 지어내지 않는다)", async () => {
    const off = setup(false);
    // Response.error()는 본문이 비어 있는 네트워크 오류 응답이다. (브라우저가 평소의 오프라인 오류 화면을 보여준다)
    expect(await off.request("/history/bench-press")).toBe("");
  });

  it("GET이 아닌 요청, 다른 사이트 요청, 서비스 워커 자신, 개발용 페이지는 건드리지 않는다", async () => {
    const s = setup(true);
    expect(await s.request("/x", { method: "POST" })).toBeNull();
    expect(await s.request("/x", { origin: "https://other.test" })).toBeNull();
    expect(await s.request("/sw.js")).toBeNull();
    expect(await s.request("/dev/seed")).toBeNull();
  });
});
