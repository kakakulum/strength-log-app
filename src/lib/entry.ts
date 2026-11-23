// Design Ref: §2 — 진행 중 운동을 "이어서 열지 않는" 규칙을 위한 진입 표시.
//
// 설정 화면에서 [시작]을 눌러 세트 진행 화면으로 "이동"한 경우에만 진행 화면을 열어 준다.
// 이 값은 브라우저 문서가 살아 있는 동안만 메모리에 남는다.
// 새로고침하거나 주소를 직접 입력하면 문서가 새로 로드되어 값이 사라지므로,
// 그때는 진행 정보를 지우고 홈으로 보낸다. (이미 완료한 세트 기록은 그대로 남는다.)
//
// (참고: performance.getEntriesByType("navigation")의 type은 문서를 처음 불러올 때 한 번 정해져서
//  이후 화면 이동에서는 바뀌지 않는다. 그래서 새로고침 여부를 그 값으로 판정하면,
//  새로고침한 뒤 정상적으로 시작한 운동도 "새로고침"으로 잘못 판정된다.)
let allowedWorkoutId: string | null = null;

/** 설정 화면에서 시작한 운동의 세트 진행 화면 진입을 허용한다. */
export function allowSessionEntry(workoutId: string): void {
  allowedWorkoutId = workoutId;
}

/** 이 문서 안에서 설정 화면을 거쳐 시작한 운동인지 확인한다. */
export function isSessionEntryAllowed(workoutId: string): boolean {
  return allowedWorkoutId === workoutId;
}
