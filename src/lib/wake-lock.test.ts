// 화면 꺼짐 방지 테스트: 켜기·끄기·다시 요청·미지원 환경
import { afterEach, describe, expect, it, vi } from "vitest";
import { keepScreenAwake } from "./wake-lock";

function setup(opts: { support?: boolean; reject?: boolean } = {}) {
  const sentinels: { released: boolean; release: () => Promise<void> }[] = [];
  const request = vi.fn(async () => {
    if (opts.reject) throw new Error("denied");
    const s = {
      released: false,
      release: async () => {
        s.released = true;
      },
    };
    sentinels.push(s);
    return s;
  });
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: "visible" as "visible" | "hidden",
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal("navigator", opts.support === false ? {} : { wakeLock: { request } });
  vi.stubGlobal("document", doc);
  const fire = () => listeners.forEach((fn) => fn());
  return { request, sentinels, doc, listeners, fire };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.unstubAllGlobals());

describe("keepScreenAwake", () => {
  it("켜면 화면 잠금을 한 번 요청하고, 끄면 놓는다", async () => {
    const t = setup();
    const stop = keepScreenAwake();
    await tick();
    expect(t.request).toHaveBeenCalledTimes(1);
    expect(t.sentinels[0].released).toBe(false);
    stop();
    await tick();
    expect(t.sentinels[0].released).toBe(true);
    expect(t.listeners.size).toBe(0);
  });

  it("다른 앱을 보다 돌아와 잠금이 풀려 있으면 다시 요청한다 (이미 잡고 있으면 중복 요청 안 함)", async () => {
    const t = setup();
    const stop = keepScreenAwake();
    await tick();
    t.fire(); // 아직 잠금을 잡고 있음
    await tick();
    expect(t.request).toHaveBeenCalledTimes(1);
    t.sentinels[0].released = true; // 브라우저가 풀어 버림
    t.fire();
    await tick();
    expect(t.request).toHaveBeenCalledTimes(2);
    stop();
  });

  it("화면이 숨겨진 상태에서는 요청하지 않는다", async () => {
    const t = setup();
    t.doc.visibilityState = "hidden";
    const stop = keepScreenAwake();
    await tick();
    expect(t.request).not.toHaveBeenCalled();
    stop();
  });

  it("요청 중에 꺼지면 얻은 잠금을 바로 놓는다", async () => {
    const t = setup();
    const stop = keepScreenAwake();
    stop();
    await tick();
    expect(t.sentinels.every((s) => s.released)).toBe(true);
  });

  it("지원하지 않거나 거부돼도 오류 없이 넘어간다", async () => {
    setup({ support: false });
    expect(() => keepScreenAwake()()).not.toThrow();
    setup({ reject: true });
    const stop = keepScreenAwake();
    await tick();
    expect(() => stop()).not.toThrow();
  });
});
