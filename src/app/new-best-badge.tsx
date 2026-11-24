// 새 최고 기록 배지: `새 최고 기록 12회!`와 짧은 축하 효과(색종이). 효과는 CSS만 쓰고, 움직임 줄이기 설정이면 꺼진다.
// 세트 진행 화면(휴식 중)과 운동 결과 화면에서 같이 쓴다.

// 색종이 조각: 가운데에서 사방으로 흩어지는 방향·회전·색·시작 지연을 미리 정해 둔다. (렌더마다 같은 모양)
const PIECES = [
  { dx: -70, dy: -50, rot: 200, color: "#f97316", delay: 0 },
  { dx: -40, dy: -75, rot: -160, color: "#eab308", delay: 40 },
  { dx: 0, dy: -85, rot: 260, color: "#22c55e", delay: 0 },
  { dx: 40, dy: -75, rot: -220, color: "#3b82f6", delay: 60 },
  { dx: 70, dy: -50, rot: 180, color: "#ec4899", delay: 20 },
  { dx: -85, dy: -10, rot: -240, color: "#a855f7", delay: 80 },
  { dx: 85, dy: -10, rot: 240, color: "#f97316", delay: 30 },
  { dx: -60, dy: 25, rot: 150, color: "#22c55e", delay: 50 },
  { dx: 60, dy: 25, rot: -150, color: "#eab308", delay: 10 },
  { dx: 0, dy: 40, rot: 300, color: "#3b82f6", delay: 70 },
];

export default function NewBestBadge({ reps }: { reps: number }) {
  return (
    <div className="relative flex justify-center py-2">
      <p
        role="status"
        className="new-best-badge rounded-full bg-amber-400 px-5 py-2 text-lg font-extrabold text-zinc-900"
      >
        🎉 새 최고 기록 {reps}회!
      </p>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti-piece absolute block h-2 w-1.5 rounded-[1px]"
            style={
              {
                backgroundColor: p.color,
                animationDelay: `${p.delay}ms`,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--rot": `${p.rot}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
    </div>
  );
}
