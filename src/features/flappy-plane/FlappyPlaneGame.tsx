import { useEffect, useMemo, useRef, useState } from "react";
import { useHandY } from "./useHandY";
import KurdistanBanner from "./KurdistanBanner";

type GameStatus = "ready" | "playing" | "gameover";

type Obstacle = {
  id: string;
  x: number;
  width: number;
  gapY: number;
  gapH: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function uid() {
  return Math.random().toString(16).slice(2);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export default function FlappyPlaneGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const tracking = useHandY(videoRef, { point: "wrist", selfieMode: true, smoothing: 0.22 });

  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try {
      const v = localStorage.getItem("flappy_plane_best");
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  });

  const [planeY, setPlaneY] = useState(0.5); // normalized 0..1 of playfield
  const planeYRef = useRef(0.5);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [fieldSize, setFieldSize] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(performance.now());
  const spawnAccRef = useRef(0);
  const passedRef = useRef<Set<string>>(new Set());
  const liveScoreRef = useRef(0);

  const settings = useMemo(
    () => ({
      groundH: 76,
      planeW: 52,
      planeH: 30,
      obstacleSpeed: 260, // px/sec
      spawnEvery: 1.35, // seconds
      obstacleW: 84,
      gapH: 160,
      paddingTop: 18,
      paddingBottom: 18,
    }),
    []
  );

  // Observe playfield size for accurate pixel mapping
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setFieldSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep refs in sync
  useEffect(() => {
    planeYRef.current = planeY;
  }, [planeY]);
  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  useEffect(() => {
    try {
      localStorage.setItem("flappy_plane_best", String(best));
    } catch {
      // ignore
    }
  }, [best]);

  // Signature moment: background parallax follows plane Y
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const v = clamp(planeYRef.current, 0, 1);
    // 0..1 -> translate background subtly
    el.style.setProperty("--parallax", String((v - 0.5) * 18));
  }, [planeY]);

  const reset = () => {
    setScore(0);
    liveScoreRef.current = 0;
    passedRef.current = new Set();
    spawnAccRef.current = 0;
    obstaclesRef.current = [];
    setObstacles([]);
    setPlaneY(0.5);
    setStatus("ready");
  };

  const start = () => {
    setScore(0);
    liveScoreRef.current = 0;
    passedRef.current = new Set();
    spawnAccRef.current = 0;
    obstaclesRef.current = [];
    setObstacles([]);
    setStatus("playing");
    lastTRef.current = performance.now();
  };

  const endGame = () => {
    setStatus("gameover");
    setBest((b) => Math.max(b, liveScoreRef.current));
  };

  // Map tracked Y to plane Y (strict follow; no gravity)
  useEffect(() => {
    if (status !== "playing") return;
    if (tracking.status === "running") {
      // Image Y: 0 top -> 1 bottom; invert feels natural for "move hand up -> plane up"
      const normalized = clamp(tracking.y, 0, 1);
      setPlaneY(normalized);
    }
  }, [tracking, status]);

  // Main game loop
  useEffect(() => {
    if (status !== "playing") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (t: number) => {
      const wrap = wrapRef.current;
      if (!wrap) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.033, (t - lastTRef.current) / 1000);
      lastTRef.current = t;

      const rect = wrap.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const groundTop = H - settings.groundH;

      // Spawn obstacles
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= settings.spawnEvery) {
        spawnAccRef.current = 0;
        const margin = settings.paddingTop;
        const maxY = Math.max(margin, groundTop - settings.gapH - settings.paddingBottom);
        const gapY = clamp(
          margin + Math.random() * (maxY - margin),
          margin,
          groundTop - settings.gapH - settings.paddingBottom
        );

        const next: Obstacle = {
          id: uid(),
          x: W + 40,
          width: settings.obstacleW,
          gapY,
          gapH: settings.gapH,
        };

        const updated = [...obstaclesRef.current, next];
        obstaclesRef.current = updated;
        setObstacles(updated);
      }

      // Move obstacles
      const moved = obstaclesRef.current
        .map((o) => ({ ...o, x: o.x - settings.obstacleSpeed * dt }))
        .filter((o) => o.x + o.width > -40);

      // Score: pass obstacle once
      const planeX = 140;
      for (const o of moved) {
        if (!passedRef.current.has(o.id) && o.x + o.width < planeX) {
          passedRef.current.add(o.id);
          liveScoreRef.current += 1;
          setScore(liveScoreRef.current);
        }
      }

      // Collision
      const planePxY = clamp(planeYRef.current, 0, 1) * (groundTop - settings.planeH);
      const planeRect = { x: planeX, y: planePxY, w: settings.planeW, h: settings.planeH };
      const groundRect = { x: 0, y: groundTop, w: W, h: settings.groundH };

      if (intersects(planeRect, groundRect)) {
        endGame();
        return;
      }

      for (const o of moved) {
        const topRect = { x: o.x, y: 0, w: o.width, h: o.gapY };
        const botRect = { x: o.x, y: o.gapY + o.gapH, w: o.width, h: groundTop - (o.gapY + o.gapH) };
        if (intersects(planeRect, topRect) || intersects(planeRect, botRect)) {
          endGame();
          return;
        }
      }

      obstaclesRef.current = moved;
      setObstacles(moved);

      // Keep signature parallax responsive (cheap)
      const parallax = (planeYRef.current - 0.5) * 18;
      wrap.style.setProperty("--parallax", String(parallax));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [status, settings]);

  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-5xl">
        <KurdistanBanner instituteName="پەیمانگای تەکنیکی نیشتمانی" />
        <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Flappy Plane — Hand Gesture Control
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Move your hand up/down in front of the camera. The plane follows your hand precisely — no gravity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg border bg-card px-3 py-2 shadow-soft">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="text-lg font-semibold tabular-nums leading-none">{score}</div>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 shadow-soft">
              <div className="text-xs text-muted-foreground">Best</div>
              <div className="text-lg font-semibold tabular-nums leading-none">{best}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div
            ref={wrapRef}
            className="noise-overlay relative aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-sky-gradient shadow-pop"
            style={{
              // used by parallax layers
              // @ts-expect-error CSS var
              "--parallax": 0,
            }}
          >
            {/* Parallax clouds */}
            <div
              className={
                "pointer-events-none absolute inset-0 opacity-90 " +
                (reducedMotion ? "" : "animate-pan-clouds")
              }
              style={{
                transform: `translate3d(calc(var(--parallax) * 1px), 0, 0)`,
              }}
            >
              <CloudBand className="absolute left-[-10%] top-6 w-[130%]" density="high" />
              <CloudBand className="absolute left-[-20%] top-24 w-[140%] opacity-80" density="low" />
            </div>

            {/* Ground */}
            <div className="absolute inset-x-0 bottom-0 h-[76px] bg-game-ground">
              <div className="absolute inset-x-0 top-0 h-3 bg-secondary" />
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(90deg, transparent 0 20px, hsl(var(--foreground)/0.08) 20px 22px, transparent 22px 42px)" }} />
            </div>

            {/* Obstacles */}
            {obstacles.map((o) => (
              <div key={o.id} className="pointer-events-none absolute inset-y-0" style={{ left: o.x, width: o.width }}>
                {/* top */}
                <div className="absolute left-0 top-0 w-full" style={{ height: o.gapY }}>
                  <Pipe cap="bottom" />
                </div>
                {/* bottom */}
                <div className="absolute left-0 w-full" style={{ top: o.gapY + o.gapH, bottom: settings.groundH }}>
                  <Pipe cap="top" />
                </div>
              </div>
            ))}

            {/* Plane */}
            {(() => {
              const groundTop = Math.max(0, fieldSize.h - settings.groundH);
              const yPx = clamp(planeY, 0, 1) * Math.max(0, groundTop - settings.planeH);
              return (
            <div
              className={
                "pointer-events-none absolute left-[140px] top-0 will-change-transform " +
                (status === "playing" ? "" : "animate-pop-in")
              }
              style={{
                transform: `translate3d(0, ${yPx}px, 0)`,
              }}
            >
              <PlaneSprite floating={status !== "playing"} reducedMotion={reducedMotion} />
            </div>
              );
            })()}

            {/* Overlay UI */}
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <StatusPill tracking={tracking} />
              {status !== "playing" ? null : tracking.status !== "running" ? (
                <div className="rounded-full border bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                  Show one hand to control
                </div>
              ) : null}
            </div>

            {status !== "playing" ? (
              <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-md rounded-2xl border bg-card/80 p-5 text-center shadow-pop backdrop-blur">
                  <div className="mb-2 text-sm font-semibold">
                    {status === "ready" ? "Ready to fly?" : "Crashed!"}
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Allow camera access, then move your hand up/down. Avoid the pipes and don’t hit the ground.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={status === "gameover" ? start : start}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {status === "ready" ? "Start" : "Try again"}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center justify-center rounded-xl border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Tip: Keep your wrist/palm in frame. Up = climb, down = dive.
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Side panel */}
          <aside className="rounded-2xl border bg-card p-4 shadow-soft">
            <h2 className="text-sm font-semibold">How it works</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Input:</span> MediaPipe tracks your hand.
              </li>
              <li>
                <span className="font-medium text-foreground">Mapping:</span> wrist Y → plane Y (1:1).
              </li>
              <li>
                <span className="font-medium text-foreground">Physics:</span> no gravity — precise control.
              </li>
              <li>
                <span className="font-medium text-foreground">Collision:</span> touch pipe or ground to end.
              </li>
            </ul>

            <div className="mt-4 rounded-xl border bg-secondary/40 p-3">
              <div className="text-xs font-semibold text-foreground">Privacy note</div>
              <p className="mt-1 text-xs text-muted-foreground">
                The camera feed is processed locally in your browser for hand tracking.
              </p>
            </div>

            {/* Hidden video element used by MediaPipe */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-foreground">Camera</div>
              <div className="mt-2 overflow-hidden rounded-xl border bg-muted">
                <video ref={videoRef} className="h-auto w-full" autoPlay playsInline muted />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                If you prefer, you can cover this preview — tracking still works.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ tracking }: { tracking: ReturnType<typeof useHandY> }) {
  const label =
    tracking.status === "starting"
      ? "Starting camera…"
      : tracking.status === "running"
        ? "Hand locked"
        : tracking.status === "no_hand"
          ? "No hand"
          : tracking.status === "error"
            ? "Camera error"
            : "Idle";

  const tone =
    tracking.status === "running"
      ? "bg-secondary/70"
      : tracking.status === "error"
        ? "bg-destructive/20"
        : "bg-card/80";

  return (
    <div className={`rounded-full border ${tone} px-3 py-1 text-xs font-semibold text-foreground shadow-soft backdrop-blur`}>
      {label}
    </div>
  );
}

function Pipe({ cap }: { cap: "top" | "bottom" }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 rounded-xl border bg-gradient-to-b from-game-pipe-2 to-game-pipe shadow-soft" />
      <div
        className={
          "absolute left-[-6px] right-[-6px] h-6 rounded-xl border bg-secondary/70 shadow-soft " +
          (cap === "top" ? "top-[-6px]" : "bottom-[-6px]")
        }
      />
      <div className="absolute inset-x-2 top-2 bottom-2 rounded-lg border border-foreground/10" />
    </div>
  );
}

function PlaneSprite({ floating, reducedMotion }: { floating: boolean; reducedMotion: boolean }) {
  return (
    <div className={"relative h-[30px] w-[52px] " + (floating && !reducedMotion ? "animate-floaty" : "")}
      style={{ filter: "drop-shadow(0 10px 18px hsl(var(--foreground) / 0.18))" }}>
      {/* body */}
      <div className="absolute inset-y-[5px] left-[6px] right-[2px] rounded-full border bg-secondary" />
      {/* nose */}
      <div className="absolute right-0 top-[8px] h-[14px] w-[14px] rounded-full border bg-accent" />
      {/* cockpit */}
      <div className="absolute left-[18px] top-[6px] h-[10px] w-[18px] rounded-full border bg-card" />
      {/* wing */}
      <div className="absolute left-[18px] top-[16px] h-[10px] w-[22px] -skew-x-12 rounded-lg border bg-primary" />
      {/* tail */}
      <div className="absolute left-[2px] top-[10px] h-[10px] w-[10px] rounded-lg border bg-primary" />
      {/* propeller */}
      <div className="absolute right-[10px] top-[14px] h-[2px] w-[10px] rounded-full bg-foreground/30" />
    </div>
  );
}

function CloudBand({ className, density }: { className?: string; density: "high" | "low" }) {
  const count = density === "high" ? 9 : 6;
  return (
    <div className={className}>
      <div className="relative flex gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-24 rounded-full border bg-card/80 shadow-soft backdrop-blur"
            style={{
              transform: `translateY(${(i % 3) * 8}px) scale(${0.85 + (i % 4) * 0.06})`,
              opacity: 0.75,
            }}
          />
        ))}
      </div>
    </div>
  );
}
