import { describe, expect, it } from "vitest";
import { allowSessionEntry, isSessionEntryAllowed } from "./entry";

describe("세트 진행 화면 진입 표시", () => {
  it("허용하기 전에는 어떤 운동도 열 수 없다 (새로고침·주소 직접 입력 직후와 같은 상태)", () => {
    expect(isSessionEntryAllowed("w1")).toBe(false);
  });

  it("설정 화면에서 시작한 운동만 열 수 있다", () => {
    allowSessionEntry("w1");
    expect(isSessionEntryAllowed("w1")).toBe(true);
    expect(isSessionEntryAllowed("w2")).toBe(false);
  });

  it("새 운동을 시작하면 이전 운동의 허용은 사라진다", () => {
    allowSessionEntry("w1");
    allowSessionEntry("w2");
    expect(isSessionEntryAllowed("w1")).toBe(false);
    expect(isSessionEntryAllowed("w2")).toBe(true);
  });
});
