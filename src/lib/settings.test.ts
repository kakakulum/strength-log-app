// 종목별 마지막 설정 저장·불러오기 테스트
import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings, loadSettingsFor, saveSettings } from "./storage";

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  const local = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: local, sessionStorage: local };
});

const squat = { exerciseId: "squat", plannedSets: 4, targetReps: 10, restSec: 180 } as const;
const deadlift = { exerciseId: "deadlift", plannedSets: 3, targetReps: 5, restSec: 240 } as const;

describe("종목별 설정", () => {
  it("스쿼트와 데드리프트 설정이 서로 섞이지 않는다", () => {
    saveSettings(squat);
    saveSettings(deadlift);
    expect(loadSettingsFor("squat")).toEqual({ ok: true, value: squat });
    expect(loadSettingsFor("deadlift")).toEqual({ ok: true, value: deadlift });
  });
  it("마지막 설정(종목 무관)은 가장 최근 것을 그대로 유지한다", () => {
    saveSettings(squat);
    saveSettings(deadlift);
    expect(loadSettings()).toEqual({ ok: true, value: deadlift });
  });
  it("설정이 없는 종목은 null (앱 기본값을 쓴다)", () => {
    saveSettings(squat);
    expect(loadSettingsFor("bench-press")).toEqual({ ok: true, value: null });
  });
  it("종목별 저장 도입 전의 기존 마지막 설정은 그 종목에서 계속 불러온다", () => {
    store.set("settings", JSON.stringify(deadlift));
    expect(loadSettingsFor("deadlift")).toEqual({ ok: true, value: deadlift });
    expect(loadSettingsFor("squat")).toEqual({ ok: true, value: null });
  });
  it("같은 종목을 다시 저장하면 그 종목 값만 바뀐다", () => {
    saveSettings(squat);
    saveSettings(deadlift);
    saveSettings({ ...squat, plannedSets: 5, targetReps: 8 });
    expect(loadSettingsFor("squat")).toEqual({
      ok: true,
      value: { ...squat, plannedSets: 5, targetReps: 8 },
    });
    expect(loadSettingsFor("deadlift")).toEqual({ ok: true, value: deadlift });
  });
  it("깨진 종목별 저장값이 있어도 저장은 성공한다", () => {
    store.set("settingsByExercise", "깨짐");
    expect(saveSettings(squat).ok).toBe(true);
    expect(loadSettingsFor("squat")).toEqual({ ok: true, value: squat });
  });
});
