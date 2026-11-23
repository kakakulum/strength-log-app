// 휴식 +30초 연장과 알림 시점 테스트
import { describe, expect, it } from "vitest";
import { EXTEND_SEC, extendRestEnd, restRemainingSec, shouldAlertRestEnd } from "./rest";

const NOW = new Date("2026-11-23T12:00:00+09:00").getTime();

describe("extendRestEnd — +30초", () => {
  it("현재 종료 시각을 30초 뒤로 미룬다 (KST 표기 유지)", () => {
    expect(EXTEND_SEC).toBe(30);
    expect(extendRestEnd("2026-11-23T12:01:00+09:00", NOW)).toBe("2026-11-23T12:01:30+09:00");
  });
  it("여러 번 누르면 그만큼 쌓인다", () => {
    const once = extendRestEnd("2026-11-23T12:01:00+09:00", NOW)!;
    expect(extendRestEnd(once, NOW)).toBe("2026-11-23T12:02:00+09:00");
  });
  it("이미 끝난 휴식은 연장하지 않는다", () => {
    expect(extendRestEnd("2026-11-23T11:59:59+09:00", NOW)).toBeNull();
    expect(extendRestEnd("2026-11-23T12:00:00+09:00", NOW)).toBeNull();
  });
  it("남은 시간이 30초 늘어난다", () => {
    const end = "2026-11-23T12:01:00+09:00";
    expect(restRemainingSec(extendRestEnd(end, NOW)!, NOW) - restRemainingSec(end, NOW)).toBe(30);
  });
});

describe("shouldAlertRestEnd — 끝나는 순간에만 알림", () => {
  it("남은 시간이 0보다 크다가 0이 될 때만 true", () => {
    expect(shouldAlertRestEnd(1, 0)).toBe(true);
  });
  it("진행 중이거나, 이미 끝나 있거나(새로고침·재렌더링), 연장으로 늘어날 때는 false", () => {
    expect(shouldAlertRestEnd(5, 4)).toBe(false);
    expect(shouldAlertRestEnd(0, 0)).toBe(false);
    expect(shouldAlertRestEnd(3, 33)).toBe(false);
  });
  it("같은 휴식을 타이머가 끝날 때까지 돌려도 알림은 한 번", () => {
    let prev = 5;
    let alerts = 0;
    for (const remaining of [4, 3, 2, 1, 0, 0, 0, 0]) {
      if (shouldAlertRestEnd(prev, remaining)) alerts += 1;
      prev = remaining;
    }
    expect(alerts).toBe(1);
  });
});
