"use client";

// 기록 복원: 백업 JSON 파일을 고르면 먼저 검증하고, 추가될 건수를 보여준 뒤 [복원]을 눌러야 합친다.
// 검증에 실패한 파일은 기존 기록에 아무 영향도 주지 않는다.
import { useRef, useState } from "react";
import { parseBackup } from "@/lib/backup";
import { loadSets, mergeSets } from "@/lib/storage";
import type { SetRecord } from "@/lib/types";

type Pending = { records: SetRecord[]; add: number; dup: number };

export default function RestorePanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function handleFile(file: File | undefined) {
    setPending(null);
    setMessage(null);
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setMessage({ text: "파일을 읽지 못했습니다.", error: true });
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setMessage({ text: `${parsed.error} 기존 기록은 그대로입니다.`, error: true });
      return;
    }
    const existing = loadSets();
    if (!existing.ok) {
      setMessage({ text: `${existing.error} 복원하지 않았습니다.`, error: true });
      return;
    }
    const keys = new Set(existing.value.map((s) => `${s.workoutId}#${s.setNo}`));
    const add = parsed.value.filter((s) => !keys.has(`${s.workoutId}#${s.setNo}`)).length;
    setPending({ records: parsed.value, add, dup: parsed.value.length - add });
  }

  function apply() {
    if (!pending) return;
    const merged = mergeSets(pending.records);
    setPending(null);
    if (inputRef.current) inputRef.current.value = "";
    setMessage(
      merged.ok
        ? {
            text: `복원했습니다. ${merged.value.added}건 추가, ${merged.value.skipped}건은 이미 있어 건너뛰었습니다.`,
            error: false,
          }
        : { text: merged.error, error: true },
    );
  }

  function cancel() {
    setPending(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label="백업 파일 선택"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm text-zinc-500 underline"
      >
        복원 (JSON)
      </button>

      {pending && (
        <div className="flex w-full flex-col gap-2 rounded-xl border-2 border-zinc-400 p-3">
          <p className="text-sm">
            파일을 확인했습니다. 기록 {pending.records.length}건 중 {pending.add}건을 추가하고,{" "}
            {pending.dup}건은 이미 있어 건너뜁니다. 기존 기록은 그대로 유지됩니다.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={pending.add === 0}
              className="rounded-lg bg-foreground px-3 py-2 font-semibold text-background disabled:opacity-40"
            >
              복원
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border-2 border-zinc-400 px-3 py-2 font-semibold"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`text-center text-sm ${message.error ? "text-red-500" : "text-zinc-500"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
