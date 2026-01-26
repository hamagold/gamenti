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
          <KurdistanFlagMark size="lg" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Flappy Plane</div>
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-secondary/40 px-3 py-1 text-[11px] font-semibold text-foreground shadow-soft">
      {children}
    </span>
  );
}


