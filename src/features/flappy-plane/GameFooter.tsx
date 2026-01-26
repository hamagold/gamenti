import ntiLogo from "@/assets/nti-logo.jpg";

type Props = {
  instituteName?: string;
};

export default function GameFooter({ instituteName = "پەیمانگای تەکنیکی نیشتمانی" }: Props) {
  return (
    <footer className="mt-8">
      <div className="noise-overlay mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border bg-card/70 shadow-pop backdrop-blur">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:items-center md:p-8">
          <div>
            <div dir="rtl" className="text-2xl font-semibold tracking-tight md:text-3xl">
              {instituteName}
            </div>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground md:text-base">
              لۆگۆی پەیمانگا و ئالای کوردستان لەگەڵ یارییەکە بۆ دیزاینێکی جوانتر.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <KurdistanFlagLarge />
              <div className="rounded-2xl border bg-secondary/40 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold text-foreground">NTI</div>
                <div className="text-xs text-muted-foreground">National Technical Institute</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[32px] bg-secondary/40 blur-xl" />
              <div className="relative grid place-items-center rounded-[32px] border bg-card p-4 shadow-pop">
                <img
                  src={ntiLogo}
                  alt="National Technical Institute logo"
                  loading="lazy"
                  className="h-44 w-44 rounded-2xl object-contain md:h-56 md:w-56"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t bg-secondary/20 px-6 py-3 text-xs text-muted-foreground md:px-8">
          © {new Date().getFullYear()} {instituteName}
        </div>
      </div>
    </footer>
  );
}

function KurdistanFlagLarge() {
  return (
    <div className="shadow-soft relative h-12 w-[92px] overflow-hidden rounded-2xl border">
      <div className="absolute inset-x-0 top-0 h-1/3 bg-flag-red" />
      <div className="absolute inset-x-0 top-1/3 h-1/3 bg-flag-white" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-flag-green" />
      <SunEmblem />
    </div>
  );
}

function SunEmblem() {
  const rays = 21;
  return (
    <svg
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      width="28"
      height="28"
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
