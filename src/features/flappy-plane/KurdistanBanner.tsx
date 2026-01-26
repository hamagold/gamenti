type Props = {
  instituteName?: string;
};

export default function KurdistanBanner({ instituteName = "پەیمانگای تەکنیکی نیشتمانی" }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <KurdistanFlagMark />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Flappy Plane</div>
          <div dir="rtl" className="text-base font-semibold">
            {instituteName}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground md:justify-end">
        <span>Move hand up/down to fly</span>
        <span className="hidden md:inline">•</span>
        <span className="hidden md:inline">Avoid pipes & ground</span>
      </div>
    </div>
  );
}

function KurdistanFlagMark() {
  return (
    <div className="shadow-soft relative h-10 w-16 overflow-hidden rounded-xl border">
      <div className="absolute inset-x-0 top-0 h-1/3 bg-flag-red" />
      <div className="absolute inset-x-0 top-1/3 h-1/3 bg-flag-white" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-flag-green" />
      <SunEmblem />
    </div>
  );
}

function SunEmblem() {
  // simple 21-ray sun approximation
  const rays = 21;
  return (
    <svg
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
    >
      <g>
        {Array.from({ length: rays }).map((_, i) => {
          const angle = (i * 360) / rays;
          return (
            <rect
              key={i}
              x="10.6"
              y="0.6"
              width="0.8"
              height="4"
              rx="0.4"
              transform={`rotate(${angle} 11 11)`}
              fill="hsl(var(--flag-sun))"
              opacity="0.95"
            />
          );
        })}
        <circle cx="11" cy="11" r="4.3" fill="hsl(var(--flag-sun))" />
        <circle cx="11" cy="11" r="2.3" fill="hsl(var(--flag-sun) / 0.9)" />
      </g>
    </svg>
  );
}
