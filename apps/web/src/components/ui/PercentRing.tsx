export function PercentRing({ percent, color = '#4f46e5' }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="relative h-9 w-9 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${color} ${clamped * 3.6}deg, #e5e7eb 0deg)` }}
    >
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-white text-[9px] font-bold text-gray-700">
        {clamped}%
      </div>
    </div>
  );
}
