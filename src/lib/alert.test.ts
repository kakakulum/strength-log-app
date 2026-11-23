import { afterEach, describe, expect, it, vi } from "vitest";
import { VIBRATE_PATTERN, playRestEndAlert, unlockAlert } from "./alert";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("휴식 종료 알림", () => {
  it("진동을 지원하면 정해진 패턴으로 진동한다", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    playRestEndAlert();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(VIBRATE_PATTERN);
  });

  it("진동도 소리도 지원하지 않는 환경(서버, 아이폰 일부)에서는 조용히 넘어간다", () => {
    vi.stubGlobal("navigator", {});
    expect(() => playRestEndAlert()).not.toThrow();
    expect(() => unlockAlert()).not.toThrow();
  });

  it("진동이 오류를 내도 멈추지 않는다", () => {
    vi.stubGlobal("navigator", {
      vibrate: () => {
        throw new Error("blocked");
      },
    });
    expect(() => playRestEndAlert()).not.toThrow();
  });

  it("진동 패턴은 세 번 울린다 (진동 3, 쉼 2)", () => {
    expect(VIBRATE_PATTERN).toHaveLength(5);
  });
});
