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
          <div className="relative">
            <div className="absolute -inset-3 rounded-[28px] bg-secondary/40 blur-xl" />
            <div className="relative overflow-hidden rounded-[28px] border bg-card p-3 shadow-pop">
              <img
                src={ntiLogo}
                alt="National Technical Institute logo"
                loading="lazy"
                className="h-24 w-24 rounded-2xl object-contain md:h-28 md:w-28"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t bg-secondary/20 px-5 py-3 text-xs text-muted-foreground md:px-6">
        Tip: Keep your wrist/palm fully in frame for smoother control.
      </div>
    </div>
  );
}

function GameNameBadge() {
  return (
    <div className="mb-2 inline-flex items-center gap-2 rounded-2xl border bg-secondary/40 px-3 py-2 shadow-soft">
      <TowerMark side="left" />
      <KurdistanFlagMark size="sm" />
      <div className="relative">
        <div className="text-sm font-extrabold tracking-tight md:text-base">Flappy Plane</div>
        <div className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-primary/30" />
      </div>
      <TowerMark side="right" />
    </div>
  );
}

function KurdistanFlagMark({ size }: { size: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-12 w-[92px] rounded-2xl" : "h-10 w-16 rounded-xl";
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
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {/* cartoon tower */}
      <path
        d="M5 21V10.6c0-.7.3-1.4.9-1.8L9 6.7V4.8c0-.5.4-.9.9-.9h4.2c.5 0 .9.4.9.9v1.9l3.1 2.1c.6.4.9 1.1.9 1.8V21"
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 21v-4.2c0-.6.4-1 1-1h6c.6 0 1 .4 1 1V21"
        fill="hsl(var(--accent) / 0.18)"
        stroke="hsl(var(--foreground) / 0.22)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* windows */}
      <rect x="9" y="10" width="2.4" height="2.8" rx="0.6" fill="hsl(var(--accent))" opacity="0.55" />
      <rect x="12.6" y="10" width="2.4" height="2.8" rx="0.6" fill="hsl(var(--accent))" opacity="0.55" />
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


