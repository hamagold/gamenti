type Props = {
  instituteName?: string;
};

import ntiLogo from "@/assets/nti-logo.jpg";
import kurdistanFlag from "@/assets/kurdistan-flag.gif";

export default function KurdistanBanner({ instituteName = "پەیمانگای تەکنیکی نیشتمانی" }: Props) {
  return (
    <div className="mb-4 overflow-hidden rounded-3xl border bg-card/70 shadow-pop backdrop-blur">
      <div className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr] md:items-center md:p-6">
        <div className="flex items-center gap-4">
          <div className="leading-tight">
            <GameNameBadge />
            <div dir="rtl" className="text-xl font-semibold tracking-tight md:text-2xl">
              {instituteName}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill>Move hand up/down</Pill>
              <Pill>Precise (no gravity)</Pill>
              <Pill>Avoid pipes & ground</Pill>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center md:justify-end">
          <div className="flex items-center gap-3">
            <GlowCard>
              <KurdistanFlagMark size="xl" />
            </GlowCard>
            <GlowCard>
              <img
                src={ntiLogo}
                alt="National Technical Institute logo"
                loading="lazy"
                className="h-24 w-24 rounded-2xl object-contain md:h-28 md:w-28"
              />
            </GlowCard>
          </div>
        </div>
      </div>
      <div className="border-t bg-secondary/20 px-5 py-3 text-xs text-muted-foreground md:px-6">
        Tip: Keep your wrist/palm fully in frame for smoother control.
      </div>
    </div>
  );
}

function GlowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-[28px] bg-secondary/40 blur-xl" />
      <div className="relative overflow-hidden rounded-[28px] border bg-card p-3 shadow-pop">{children}</div>
    </div>
  );
}

function GameNameBadge() {
  return (
    <div className="mb-2 inline-flex items-center gap-2 rounded-2xl border bg-secondary/40 px-3 py-2 shadow-soft">
      <TowerMark side="left" />
      <KurdistanFlagMark size="sm" />
      <div className="relative">
        <div className="text-sm font-extrabold tracking-tight text-flag-green md:text-base">Flappy Plane</div>
        <div className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-flag-green/35" />
      </div>
      <TowerMark side="right" />
    </div>
  );
}

function KurdistanFlagMark({ size }: { size: "sm" | "lg" | "xl" }) {
  const cls =
    size === "xl"
      ? "h-24 w-24 rounded-2xl md:h-28 md:w-28"
      : size === "lg"
        ? "h-12 w-[92px] rounded-2xl"
        : "h-10 w-16 rounded-xl";
  return (
    <div className={`shadow-soft relative overflow-hidden border ${cls}`}>
      <img
        src={kurdistanFlag}
        alt="Kurdistan flag"
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function TowerMark({ side }: { side: "left" | "right" }) {
  const flip = side === "right" ? "scale-x-[-1]" : "";
  return (
    <svg
      className={`h-7 w-7 ${flip}`}
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(var(--card) / 0.9)" />
          <stop offset="0.5" stopColor="hsl(var(--card) / 0.05)" />
          <stop offset="1" stopColor="hsl(var(--card) / 0)" />
        </linearGradient>
        <clipPath id="towerClip">
          <path d="M6 24V11.8c0-.8.4-1.6 1.1-2.1L10.2 7.5V5.4c0-.6.5-1.1 1.1-1.1h5.4c.6 0 1.1.5 1.1 1.1v2.1l3.1 2.2c.7.5 1.1 1.3 1.1 2.1V24H6Z" />
        </clipPath>
      </defs>

      {/* Outer tower silhouette */}
      <path
        d="M6 24V11.8c0-.8.4-1.6 1.1-2.1L10.2 7.5V5.4c0-.6.5-1.1 1.1-1.1h5.4c.6 0 1.1.5 1.1 1.1v2.1l3.1 2.2c.7.5 1.1 1.3 1.1 2.1V24H6Z"
        fill="hsl(var(--foreground) / 0.06)"
        stroke="hsl(var(--foreground) / 0.22)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Kurdistan-flag stripes inside */}
      <g clipPath="url(#towerClip)">
        <rect x="5" y="4" width="18" height="20" fill="hsl(var(--flag-red))" />
        <rect x="5" y="11" width="18" height="7" fill="hsl(var(--flag-white))" />
        <rect x="5" y="18" width="18" height="8" fill="hsl(var(--flag-green))" />

        {/* small sun emblem */}
        <g transform="translate(14 15)">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x={-0.4}
              y={-6.8}
              width={0.8}
              height={3.0}
              rx={0.4}
              transform={`rotate(${(i * 360) / 12})`}
              fill="hsl(var(--flag-sun))"
              opacity="0.95"
            />
          ))}
          <circle r="3.1" fill="hsl(var(--flag-sun))" />
        </g>

        {/* shine */}
        <rect x="5" y="4" width="18" height="20" fill="url(#tShine)" />
      </g>

      {/* base */}
      <path
        d="M9 24v-4.4c0-.7.6-1.3 1.3-1.3h7.4c.7 0 1.3.6 1.3 1.3V24"
        fill="hsl(var(--secondary) / 0.35)"
        stroke="hsl(var(--foreground) / 0.18)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-secondary/40 px-3 py-1 text-[11px] font-semibold text-foreground shadow-soft">
      {children}
    </span>
  );
}


