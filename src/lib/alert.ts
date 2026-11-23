// Design Ref: §1 세트 진행 — 휴식이 끝나면 진동과 소리로 알린다.
//
// - 진동: navigator.vibrate (안드로이드 크롬 등). 아이폰 사파리는 지원하지 않아 소리만 난다.
// - 소리: 파일 없이 Web Audio로 짧은 "삐" 소리 3번을 만든다.
// - 브라우저는 사용자가 화면을 누른 뒤에만 소리를 낼 수 있으므로, [세트 완료]를 누를 때
//   unlockAlert()를 불러 소리를 미리 켜 둔다. (아이폰은 특히 이 과정이 필요하다.)
// - 외부로 보내는 것은 없고, 알림을 못 내는 환경에서는 조용히 넘어간다.

/** 진동 패턴(ms): 진동, 쉼, 진동, 쉼, 진동 */
export const VIBRATE_PATTERN = [300, 120, 300, 120, 300];

/** 소리 설정: 높은 음(Hz), 길이(초), 간격(초), 음량 */
const BEEP = { frequency: 880, duration: 0.25, gap: 0.15, count: 3, volume: 0.35 };

type AudioContextCtor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** 사용자가 화면을 누르는 순간에 불러, 나중에 소리를 낼 수 있게 준비한다. */
export function unlockAlert(): void {
  try {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    if (!audioContext) audioContext = new Ctor();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // 소리를 준비하지 못해도 진동과 화면 표시는 그대로 동작한다.
  }
}

function playBeeps(): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const start = ctx.currentTime + 0.02;
  for (let i = 0; i < BEEP.count; i++) {
    const t = start + i * (BEEP.duration + BEEP.gap);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = BEEP.frequency;
    // 처음과 끝을 부드럽게 해서 "딱" 소리가 나지 않게 한다.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(BEEP.volume, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + BEEP.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + BEEP.duration + 0.02);
  }
}

/** 휴식이 끝났을 때 진동과 소리로 알린다. 지원하지 않는 기능은 건너뛴다. */
export function playRestEndAlert(): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(VIBRATE_PATTERN);
    }
  } catch {
    // 진동이 막혀 있어도 소리는 낸다.
  }
  try {
    unlockAlert(); // 아직 준비되지 않았다면 한 번 더 시도한다.
    playBeeps();
  } catch {
    // 소리가 막혀 있어도 화면의 `휴식 완료` 표시는 그대로 나온다.
  }
}
