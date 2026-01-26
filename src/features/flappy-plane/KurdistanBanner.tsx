type Props = {
  instituteName?: string;
};

export default function KurdistanBanner({ instituteName = "پەیمانگای تەکنیکی نیشتمانی" }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <KurdistanFlagMark />
          <InstituteLogoMark />
        </div>
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

function InstituteLogoMark() {
  // Simple, token-based mark inspired by the NTI emblem (gear ring + pen nib).
  // Uses only CSS variables/tokens so it matches the theme.
  return (
    <div className="shadow-soft relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border bg-card">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        {/* gear ring */}
        <g fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="15" cy="15" r="10.5" opacity="0.95" />
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i * 360) / 10;
            return (
              <path
                key={i}
                d="M15 1.6 V4.0"
                transform={`rotate(${a} 15 15)`}
                opacity="0.8"
              />
            );
          })}
        </g>

        {/* inner circle */}
        <circle cx="15" cy="15" r="6.2" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="1" />

        {/* pen nib */}
        <path
          d="M15 8.5 L19.2 14.2 L15 22 L10.8 14.2 Z"
          fill="hsl(var(--accent))"
          stroke="hsl(var(--foreground) / 0.15)"
          strokeWidth="1"
        />
        <path
          d="M15 12.2 L16.4 14.6 L15 17.2 L13.6 14.6 Z"
          fill="hsl(var(--card))"
          opacity="0.9"
        />
        <circle cx="15" cy="18.2" r="0.9" fill="hsl(var(--foreground) / 0.35)" />
      </svg>
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
