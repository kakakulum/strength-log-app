// Design Ref: §5 휴식 종료 알림의 한계 — 화면이 꺼지면 타이머가 늦어지고 소리·진동이 나지 않을 수 있다.
// 운동 중에는 화면 꺼짐 방지(Screen Wake Lock)를 요청해 그 문제를 줄인다.
// - 지원하지 않거나 거부되면 조용히 넘어간다. (원래 동작 그대로)
// - 다른 앱·탭으로 갔다 돌아오면 브라우저가 잠금을 풀어 두므로, 화면이 다시 보일 때 다시 요청한다.
// - 서버로 보내는 것은 없다.

type Sentinel = { released: boolean; release: () => Promise<void> };
type WakeLockApi = { request: (type: "screen") => Promise<Sentinel> };

function getApi(): WakeLockApi | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock;
  return api && typeof api.request === "function" ? api : null;
}

/**
 * 화면 꺼짐 방지를 켠다. 돌려주는 함수를 부르면 끈다.
 * 지원하지 않는 환경에서도 오류 없이 아무것도 하지 않는 함수를 돌려준다.
 */
export function keepScreenAwake(): () => void {
  const api = getApi();
  if (!api || typeof document === "undefined") return () => {};

  let sentinel: Sentinel | null = null;
  let stopped = false;

  async function acquire() {
    if (stopped || document.visibilityState === "hidden") return;
    if (sentinel && !sentinel.released) return;
    try {
      const next = await api!.request("screen");
      if (stopped) {
        // 요청하는 사이에 이미 꺼진 경우: 얻은 잠금을 바로 놓는다.
        void next.release().catch(() => {});
        return;
      }
      sentinel = next;
    } catch {
      // 배터리 절약 모드 등으로 거부되어도 앱은 그대로 동작한다.
    }
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void acquire();
  };
  document.addEventListener("visibilitychange", onVisible);
  void acquire();

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
    sentinel = null;
  };
}
