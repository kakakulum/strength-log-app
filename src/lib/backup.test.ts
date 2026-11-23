// 기록 백업·복원 테스트: 검증, 중복 방지, 잘못된 파일이 기존 기록에 영향 없음
import { beforeEach, describe, expect, it } from "vitest";
import { buildBackup, parseBackup } from "./backup";
import { loadSets, mergeSets, saveSet, updateSetReps } from "./storage";
import type { SetRecord } from "./types";

// 테스트용 가짜 브라우저 저장소
function installStorage() {
  const data = new Map<string, string>();
  const local = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: local,
    sessionStorage: local,
    dispatchEvent: () => true,
  };
  return data;
}

const rec = (workoutId: string, setNo: number, reps: number, exerciseId = "squat"): SetRecord => ({
  workoutId,
  setNo,
  exerciseId: exerciseId as SetRecord["exerciseId"],
  reps,
  completedAt: "2026-11-03T10:00:00+09:00",
});

let store: Map<string, string>;
beforeEach(() => {
  store = installStorage();
});

describe("buildBackup / parseBackup", () => {
  it("백업한 기록을 그대로 다시 읽는다", () => {
    const sets = [rec("a", 1, 8), rec("a", 2, 9)];
    const parsed = parseBackup(buildBackup(sets));
    expect(parsed).toEqual({ ok: true, value: sets });
  });
  it("JSON이 아니거나 다른 앱·버전의 파일은 거부", () => {
    expect(parseBackup("그냥 글").ok).toBe(false);
    expect(parseBackup("[]").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other", version: 1, sets: [] })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "strength-log", version: 2, sets: [] })).ok).toBe(false);
  });
  it("기록 하나라도 잘못되면(횟수 0·101·소수, 없는 종목, 잘못된 시각) 파일 전체를 거부", () => {
    const base = JSON.parse(buildBackup([rec("a", 1, 8)]));
    for (const bad of [
      { ...base.sets[0], reps: 0 },
      { ...base.sets[0], reps: 101 },
      { ...base.sets[0], reps: 7.5 },
      { ...base.sets[0], exerciseId: "curl" },
      { ...base.sets[0], completedAt: "어제" },
      { ...base.sets[0], setNo: 0 },
    ]) {
      const r = parseBackup(JSON.stringify({ ...base, sets: [base.sets[0], bad] }));
      expect(r.ok).toBe(false);
    }
  });
});

describe("mergeSets — 복원", () => {
  it("기존 기록을 유지하고 운동 ID + 세트 번호가 같은 기록은 추가하지 않는다", () => {
    saveSet(rec("a", 1, 8));
    saveSet(rec("a", 2, 8));
    const r = mergeSets([rec("a", 2, 99), rec("a", 3, 8), rec("b", 1, 10)]);
    expect(r).toEqual({ ok: true, value: { added: 2, skipped: 1 } });
    const all = loadSets();
    expect(all.ok && all.value.length).toBe(4);
    // 이미 있던 a-2는 백업 값(99)으로 덮어쓰지 않는다
    expect(all.ok && all.value.find((s) => s.workoutId === "a" && s.setNo === 2)?.reps).toBe(8);
  });
  it("같은 백업을 두 번 복원해도 두 번째는 0건 추가", () => {
    const backup = [rec("a", 1, 8), rec("a", 2, 8)];
    expect(mergeSets(backup)).toEqual({ ok: true, value: { added: 2, skipped: 0 } });
    expect(mergeSets(backup)).toEqual({ ok: true, value: { added: 0, skipped: 2 } });
  });
  it("잘못된 파일을 거부해도 기존 기록은 바뀌지 않는다", () => {
    saveSet(rec("a", 1, 8));
    const before = store.get("sets");
    expect(parseBackup('{"app":"strength-log","version":1,"sets":[{"x":1}]}').ok).toBe(false);
    expect(store.get("sets")).toBe(before);
  });
  it("형식이 낯선 기존 항목도 지우지 않고 보존한다", () => {
    store.set("sets", JSON.stringify([{ foo: "bar" }, rec("a", 1, 8)]));
    mergeSets([rec("b", 1, 5)]);
    expect(JSON.parse(store.get("sets")!)).toHaveLength(3);
  });
});

describe("updateSetReps — 횟수 수정", () => {
  it("횟수만 바뀌고 세트 수·날짜·세트 번호는 그대로", () => {
    saveSet(rec("a", 1, 8));
    saveSet(rec("a", 2, 8));
    const r = updateSetReps("a", [{ setNo: 2, reps: 12 }]);
    expect(r.ok).toBe(true);
    const all = loadSets();
    expect(all.ok && all.value.map((s) => s.reps)).toEqual([8, 12]);
    expect(all.ok && all.value).toHaveLength(2);
    expect(all.ok && all.value[1].completedAt).toBe("2026-11-03T10:00:00+09:00");
  });
  it("0·101·소수는 거부하고, 일부만 저장되지도 않는다", () => {
    saveSet(rec("a", 1, 8));
    saveSet(rec("a", 2, 8));
    const before = store.get("sets");
    for (const reps of [0, 101, 7.5, -1]) {
      expect(updateSetReps("a", [{ setNo: 1, reps }]).ok).toBe(false);
    }
    expect(updateSetReps("a", [{ setNo: 1, reps: 20 }, { setNo: 9, reps: 5 }]).ok).toBe(false);
    expect(store.get("sets")).toBe(before);
  });
});

describe("날짜 형식이 틀린 기록 거르기", () => {
  it("읽을 때 걸러내고 다른 기록은 그대로 보여준다 (원본은 지우지 않는다)", () => {
    const bad = { ...rec("x", 1, 5), completedAt: "어제" };
    store.set("sets", JSON.stringify([bad, rec("a", 1, 8)]));
    const loaded = loadSets();
    expect(loaded.ok && loaded.value.map((s) => s.workoutId)).toEqual(["a"]);
    expect(JSON.parse(store.get("sets")!)).toHaveLength(2);
  });
  it("날짜가 틀린 기록은 저장하지 않는다", () => {
    expect(saveSet({ ...rec("x", 1, 5), completedAt: "어제" }).ok).toBe(false);
  });
});

describe("날짜 범위 제한", () => {
  const bad = (completedAt: string) => ({ ...rec("x", 1, 5), completedAt });
  it("JS 날짜 최대값 근처·2000년 이전·2100년 이후·형식이 다른 날짜는 거부", () => {
    for (const t of ["+275760-09-13T00:00:00Z", "1999-12-31T23:59:59+09:00", "2100-01-02T00:00:00+09:00", "2026-11-03", "2026/11/03 10:00"]) {
      expect(saveSet(bad(t)).ok, t).toBe(false);
    }
  });
  it("정상 KST·UTC 표기는 통과", () => {
    expect(saveSet(bad("2026-11-03T10:00:00+09:00")).ok).toBe(true);
    expect(saveSet({ ...bad("2026-10-31T15:00:00Z"), setNo: 2 }).ok).toBe(true);
  });
  it("복원 파일에 먼 미래 날짜가 있으면 파일 전체를 거부", () => {
    const base = JSON.parse(buildBackup([rec("a", 1, 8)]));
    base.sets.push(bad("+275760-09-13T00:00:00Z"));
    expect(parseBackup(JSON.stringify(base)).ok).toBe(false);
  });
});
