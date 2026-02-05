import { useEffect, useMemo, useRef, useState } from "react";
import { useHandY } from "./useHandY";
import HandOverlay from "./HandOverlay";
import KurdistanBanner from "./KurdistanBanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type GameStatus = "ready" | "playing" | "gameover";

type Difficulty = "easy" | "normal" | "hard";

type Lang = "ku" | "en";

type ScoreEntry = {
  name: string;
  score: number;
  difficulty: Difficulty;
  at: string; // ISO
};

const SCORES_KEY = "flappy_plane_scores_v1";

function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is ScoreEntry =>
        !!x &&
        typeof (x as any).name === "string" &&
        typeof (x as any).score === "number" &&
        typeof (x as any).difficulty === "string" &&
        typeof (x as any).at === "string"
      )
      .slice(0, 200);
  } catch {
    return [];
  }
}

function saveScores(entries: ScoreEntry[]) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(entries.slice(0, 200)));
  } catch {
    // ignore
  }
}

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

  const [restartToken, setRestartToken] = useState(0);
  const tracking = useHandY(videoRef, { point: "wrist", selfieMode: true, smoothing: 0.22, restartToken });

  const [status, setStatus] = useState<GameStatus>("ready");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem("flappy_plane_lang");
      return v === "en" || v === "ku" ? v : "ku";
    } catch {
      return "ku";
    }
  });
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem("flappy_plane_player_name") ?? "";
    } catch {
      return "";
    }
  });
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
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

  const settings = useMemo(() => {
    const base = {
      groundH: 76,
      // slightly larger plane for better feel/visibility
      planeW: 62,
      planeH: 36,
      obstacleW: 84,
      paddingTop: 18,
      paddingBottom: 18,
    };

    const presets: Record<Difficulty, { obstacleSpeed: number; spawnEvery: number; gapH: number }> = {
      easy: { obstacleSpeed: 210, spawnEvery: 1.6, gapH: 190 },
      normal: { obstacleSpeed: 260, spawnEvery: 1.35, gapH: 160 },
      hard: { obstacleSpeed: 320, spawnEvery: 1.15, gapH: 135 },
    };

    return { ...base, ...presets[difficulty] };
  }, [difficulty]);

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

  useEffect(() => {
    try {
      localStorage.setItem("flappy_plane_player_name", playerName);
    } catch {
      // ignore
    }
  }, [playerName]);

  useEffect(() => {
    try {
      localStorage.setItem("flappy_plane_lang", lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const t = useMemo(() => {
    const ku = {
      title: "فڵاپی فڕۆکە — کۆنترۆڵ بە دەست",
      subtitle: "دەستت بەرز/نزم بکە لە پێش کامێرا. فڕۆکەکە بە وردی شوێنی دەستت دەگرێت — بەبێ گڕاڤیتی.",
      easy: "ئاسان",
      normal: "ئاسایی",
      hard: "سەخت",
      score: "سکۆر",
      best: "باشترین",
      showHand: "دەستیەک پیشان بدە بۆ کۆنترۆڵ",
      readyTitle: "ئامادەی بۆ فڕین؟",
      crashedTitle: "کێشایەوە!",
      readyDesc: "ڕێگە بدە بە کامێرا، پاشان دەستت بەرز/نزم بکە. دووربە لە پایپ و مەکەوە سەر زەوی.",
      fullName: "ناوی تەواو",
      namePlaceholder: "مثال: ئەحمد محەمەد",
      nameRequired: "پێویستە پێش یاری کردن ناوت بنوسیت.",
      start: "دەستپێکردن",
      tryAgain: "دووبارە هەوڵ بدە",
      reset: "ڕیسێت",
      tip: "ئامۆژگاری: قۆڵ/دەستت لە ناو فریمدا بهێڵە. بەرز=سەرەوە، نزم=خوارەوە.",
      leaderboard: "بۆردی سکۆر",
      noScores: "هێشتا هیچ سکۆرێک نییە — تۆ یەکەم بە!",
      clear: "سڕینەوە",
      howItWorks: "چۆن کار دەکات",
      input: "هاتووچۆ:",
      inputText: "MediaPipe دەستت دەدۆزێتەوە.",
      mapping: "گەڕانەوە:",
      mappingText: "wrist Y → plane Y (1:1).",
      physics: "فیزیا:",
      physicsText: "گڕاڤیتی نییە — کۆنترۆڵی ورد.",
      collision: "تێکدان:",
      collisionText: "پایپ یان زەوی بڵاو بکەیت، یاری کۆتایی دێت.",
      madeByTitle: "دروست کراوە",
      madeByPrefix: "دروست کراوە لە لاین ",
      camera: "کامێرا",
      cameraError: "هەڵەی کامێرا",
      restartCamera: "دووبارە دەستپێکردنەوەی کامێرا",
      coverPreview: "ئەگەر دەتەوێت، دەتوانیت ئەم پیشاندانییە داپۆشیت — track کردن هێشتا کار دەکات.",
      confirmClearTitle: "سڕینەوەی بۆردی سکۆر؟",
      confirmClearDesc: "هەموو سکۆرەکان لەم ئامێرەدا دەسڕێنەوە (local). ئەمە گەڕانەوە نییە.",
      cancel: "هەڵوەشاندنەوە",
      confirm: "بەڵێ، بسڕەوە",
      difficultyHint: "Stop the run to change difficulty",
    };

    const en = {
      title: "Flappy Plane — Hand Control",
      subtitle: "Move your hand up/down in front of the camera. The plane follows precisely — no gravity.",
      easy: "Easy",
      normal: "Normal",
      hard: "Hard",
      score: "Score",
      best: "Best",
      showHand: "Show one hand to control",
      readyTitle: "Ready to fly?",
      crashedTitle: "Crashed!",
      readyDesc: "Allow camera access, then move your hand up/down. Avoid the pipes and don’t hit the ground.",
      fullName: "Full name",
      namePlaceholder: "Example: Ahmed Mohammed",
      nameRequired: "Please enter your name before starting.",
      start: "Start",
      tryAgain: "Try again",
      reset: "Reset",
      tip: "Tip: Keep your wrist/palm in frame. Up = climb, down = dive.",
      leaderboard: "Leaderboard",
      noScores: "No scores yet — be the first!",
      clear: "Clear",
      howItWorks: "How it works",
      input: "Input:",
      inputText: "MediaPipe tracks your hand.",
      mapping: "Mapping:",
      mappingText: "wrist Y → plane Y (1:1).",
      physics: "Physics:",
      physicsText: "no gravity — precise control.",
      collision: "Collision:",
      collisionText: "touch pipe or ground to end.",
      madeByTitle: "Made by",
      madeByPrefix: "Made by ",
      camera: "Camera",
      cameraError: "Camera error",
      restartCamera: "Restart camera",
      coverPreview: "If you prefer, you can cover this preview — tracking still works.",
      confirmClearTitle: "Clear leaderboard?",
      confirmClearDesc: "This will remove all saved scores on this device (local). This can’t be undone.",
      cancel: "Cancel",
      confirm: "Yes, clear",
      difficultyHint: "Stop the run to change difficulty",
    };

    return lang === "ku" ? ku : en;
  }, [lang]);

  const clearLeaderboard = () => {
    setScores([]);
    try {
      localStorage.removeItem(SCORES_KEY);
    } catch {
      // ignore
    }
  };

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
    const trimmed = playerName.trim();
    if (!trimmed) return;
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

    const finalScore = liveScoreRef.current;
    const name = playerName.trim().toLowerCase();
    if (name) {
      setScores((prev) => {
        // Check if player already exists (case-insensitive name match + same difficulty)
        const existingIdx = prev.findIndex(
          (s) => s.name.toLowerCase() === name && s.difficulty === difficulty
        );

        let next: ScoreEntry[];
        if (existingIdx !== -1) {
          // Player exists - only update if new score is higher
          if (finalScore > prev[existingIdx].score) {
            next = [...prev];
            next[existingIdx] = {
              name: playerName.trim(), // Keep original casing
              score: finalScore,
              difficulty,
              at: new Date().toISOString(),
            };
          } else {
            // Score not higher, keep existing
            return prev;
          }
        } else {
          // New player - add entry
          const entry: ScoreEntry = {
            name: playerName.trim(),
            score: finalScore,
            difficulty,
            at: new Date().toISOString(),
          };
          next = [entry, ...prev];
        }

        next = next.sort((a, b) => b.score - a.score).slice(0, 50);
        saveScores(next);
        return next;
      });
    }
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

  // Store settings in a ref to avoid restarting game loop when settings object changes
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Main game loop
  useEffect(() => {
    if (status !== "playing") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    // Reset the last time when starting to avoid huge dt on first frame
    lastTRef.current = performance.now();

    const tick = (t: number) => {
      const wrap = wrapRef.current;
      if (!wrap) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const currentSettings = settingsRef.current;
      
      // Calculate delta time, cap at 100ms to handle tab switching gracefully
      const rawDt = (t - lastTRef.current) / 1000;
      const dt = Math.min(0.1, rawDt);
      lastTRef.current = t;

      // Skip frame if dt is too small or zero (prevents glitches)
      if (dt <= 0.001) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const rect = wrap.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      
      // Skip if dimensions are invalid
      if (W <= 0 || H <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      
      const groundTop = H - currentSettings.groundH;

      // Spawn obstacles
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= currentSettings.spawnEvery) {
        spawnAccRef.current = 0;

        // Dynamic difficulty (Hard): reduce gap as score increases, down to a safe minimum.
        const baseGapH = currentSettings.gapH;
        const dynamicGapH =
          difficulty === "hard"
            ? clamp(baseGapH - liveScoreRef.current * 2.2, 108, baseGapH)
            : baseGapH;

        const margin = currentSettings.paddingTop;
        const maxY = Math.max(margin, groundTop - dynamicGapH - currentSettings.paddingBottom);
        const gapY = clamp(
          margin + Math.random() * (maxY - margin),
          margin,
          groundTop - dynamicGapH - currentSettings.paddingBottom
        );

        const next: Obstacle = {
          id: uid(),
          x: W + 40,
          width: currentSettings.obstacleW,
          gapY,
          gapH: dynamicGapH,
        };

        obstaclesRef.current = [...obstaclesRef.current, next];
      }

      // Move obstacles - use current ref to avoid stale data
      const moved = obstaclesRef.current
        .map((o) => ({ ...o, x: o.x - currentSettings.obstacleSpeed * dt }))
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
      const planePxY = clamp(planeYRef.current, 0, 1) * (groundTop - currentSettings.planeH);
      const planeRect = { x: planeX, y: planePxY, w: currentSettings.planeW, h: currentSettings.planeH };
      const groundRect = { x: 0, y: groundTop, w: W, h: currentSettings.groundH };

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
      setObstacles([...moved]); // Create new array to ensure React updates

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
  }, [status, difficulty]);

  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-5xl">
        <KurdistanBanner instituteName="پەیمانگای تەکنیکی نیشتمانی" />
        <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 dir="rtl" className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              {t.title}
            </h1>
            <p dir="rtl" className="text-sm text-muted-foreground md:text-base">
              {t.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border bg-card px-2 py-2 shadow-soft">
              <button
                type="button"
                onClick={() => setLang((v) => (v === "ku" ? "en" : "ku"))}
                className="rounded-lg bg-secondary/40 px-3 py-1 text-xs font-semibold text-foreground shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Toggle language"
                title="KU / EN"
              >
                {lang.toUpperCase()}
              </button>
            </div>
            <div className="mr-1 flex items-center gap-1 rounded-xl border bg-card px-2 py-2 shadow-soft">
              <DiffButton
                active={difficulty === "easy"}
                disabled={status === "playing"}
                onClick={() => setDifficulty("easy")}
                title={status === "playing" ? t.difficultyHint : ""}
              >
                {t.easy}
              </DiffButton>
              <DiffButton
                active={difficulty === "normal"}
                disabled={status === "playing"}
                onClick={() => setDifficulty("normal")}
                title={status === "playing" ? t.difficultyHint : ""}
              >
                {t.normal}
              </DiffButton>
              <DiffButton
                active={difficulty === "hard"}
                disabled={status === "playing"}
                onClick={() => setDifficulty("hard")}
                title={status === "playing" ? t.difficultyHint : ""}
              >
                {t.hard}
              </DiffButton>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 shadow-soft">
              <div className="text-xs text-muted-foreground">{t.score}</div>
              <div className="text-lg font-semibold tabular-nums leading-none">{score}</div>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 shadow-soft">
              <div className="text-xs text-muted-foreground">{t.best}</div>
              <div className="text-lg font-semibold tabular-nums leading-none">{best}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div
            ref={wrapRef}
            className="noise-overlay relative aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-kurdistan-sky shadow-pop"
            style={{
              // used by parallax layers
              // @ts-expect-error CSS var
              "--parallax": 0,
            }}
          >
            {/* Sun watermark */}
            <SunWatermark reducedMotion={reducedMotion} />

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
                  {t.showHand}
                </div>
              ) : null}
            </div>

            {status !== "playing" ? (
              <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-md rounded-2xl border bg-card/80 p-5 text-center shadow-pop backdrop-blur">
                  <div className="mb-2 text-sm font-semibold">
                    {status === "ready" ? t.readyTitle : t.crashedTitle}
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t.readyDesc}
                  </p>

                  <div dir="rtl" className="mb-4 text-right">
                    <label className="mb-1 block text-xs font-semibold text-foreground">{t.fullName}</label>
                    <input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="w-full rounded-xl border bg-card px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    {!playerName.trim() ? (
                      <div className="mt-1 text-xs text-muted-foreground">{t.nameRequired}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={start}
                      disabled={!playerName.trim()}
                      className={
                        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-soft transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                        (playerName.trim()
                          ? "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.99]"
                          : "bg-secondary/60 text-muted-foreground opacity-70")
                      }
                    >
                      {status === "ready" ? t.start : t.tryAgain}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center justify-center rounded-xl border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t.reset}
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {t.tip}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Side panel */}
          <aside className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{t.leaderboard}</h2>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    disabled={scores.length === 0}
                    className={
                      "rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-soft transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                      (scores.length === 0
                        ? "bg-secondary/30 text-muted-foreground opacity-60"
                        : "bg-card text-foreground hover:scale-[1.02] active:scale-[0.99]")
                    }
                  >
                    {t.clear}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.confirmClearTitle}</AlertDialogTitle>
                    <AlertDialogDescription>{t.confirmClearDesc}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={clearLeaderboard}>{t.confirm}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="mt-2 rounded-xl border bg-secondary/20 p-3">
              {scores.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t.noScores}</div>
              ) : (
                <ol className="space-y-2">
                  {scores.slice(0, 8).map((s, idx) => (
                    <li key={`${s.at}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div dir="rtl" className="truncate font-semibold text-foreground">
                          {idx + 1}. {s.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.difficulty.toUpperCase()}</div>
                      </div>
                      <div className="shrink-0 rounded-lg border bg-card px-2 py-1 text-xs font-semibold tabular-nums text-foreground">
                        {s.score}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <h2 className="mt-4 text-sm font-semibold">{t.howItWorks}</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">{t.input}</span> {t.inputText}
              </li>
              <li>
                <span className="font-medium text-foreground">{t.mapping}</span> {t.mappingText}
              </li>
              <li>
                <span className="font-medium text-foreground">{t.physics}</span> {t.physicsText}
              </li>
              <li>
                <span className="font-medium text-foreground">{t.collision}</span> {t.collisionText}
              </li>
            </ul>

            <div dir="rtl" className="mt-4 rounded-xl border bg-secondary/40 p-3">
              <div className="text-xs font-semibold text-foreground">{t.madeByTitle}</div>
              
              {/* Supervisor */}
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">مامۆستای سەرپەرشتار: </span>
                <span className="font-semibold text-foreground">احمد هێرش عمر</span>
              </div>
              
              {/* Students */}
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">قوتابیان:</span>
              </div>
              <ol className="mt-1 space-y-0.5 text-xs">
                <li className="flex items-center gap-1">
                  <span className="text-muted-foreground">١.</span>
                  <a
                    href="https://www.instagram.com/hama_linux/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary underline underline-offset-2"
                  >
                    محمد سلیمان احمد
                  </a>
                </li>
                <li className="flex items-center gap-1">
                  <span className="text-muted-foreground">٢.</span>
                  <span className="font-semibold text-foreground">عبدالقادر طارق کریم</span>
                </li>
                <li className="flex items-center gap-1">
                  <span className="text-muted-foreground">٣.</span>
                  <span className="font-semibold text-foreground">ابراهیم حسین</span>
                </li>
              </ol>
            </div>

            {/* Hidden video element used by MediaPipe */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-foreground">{t.camera}</div>
              {tracking.status === "error" ? (
                <div className="mt-2 rounded-xl border bg-destructive/10 p-3 text-xs">
                  <div className="font-semibold text-foreground">{t.cameraError}</div>
                  <div className="mt-1 text-muted-foreground">{tracking.message}</div>
                  <button
                    type="button"
                    onClick={() => setRestartToken((v) => v + 1)}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {t.restartCamera}
                  </button>
                </div>
              ) : null}
              <div className="relative mt-2 overflow-hidden rounded-xl border bg-muted">
                <video ref={videoRef} className="h-auto w-full" autoPlay playsInline muted />
                <HandOverlay landmarks={tracking.landmarks} videoRef={videoRef} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {t.coverPreview}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SunWatermark({ reducedMotion }: { reducedMotion: boolean }) {
  const rays = 21;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <svg
        className={reducedMotion ? "opacity-12" : "animate-sun-drift"}
        width="320"
        height="320"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="sunGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(var(--flag-sun))" stopOpacity="0.55" />
            <stop offset="60%" stopColor="hsl(var(--flag-sun))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--flag-sun))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* rays */}
        <g transform="translate(50 50)">
          {Array.from({ length: rays }).map((_, i) => {
            const angle = (i * 360) / rays;
            return (
              <rect
                key={i}
                x={-1.8}
                y={-38}
                width={3.6}
                height={18}
                rx={1.8}
                transform={`rotate(${angle})`}
                fill="hsl(var(--flag-sun))"
                opacity="0.45"
              />
            );
          })}
        </g>

        {/* inner core */}
        <circle cx="50" cy="50" r="24" fill="url(#sunGradient)" />
        <circle cx="50" cy="50" r="16" fill="hsl(var(--flag-sun))" opacity="0.35" />
      </svg>
    </div>
  );
}

function DiffButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "rounded-lg px-3 py-1 text-xs font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
        (active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "bg-secondary/40 text-foreground hover:scale-[1.02] active:scale-[0.99]") +
        (disabled ? " opacity-60" : "")
      }
      title={title ?? ""}
    >
      {children}
    </button>
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
    <div
      className={
        "relative h-[36px] w-[62px] " + (floating && !reducedMotion ? "animate-floaty" : "")
      }
      style={{ filter: "drop-shadow(0 12px 18px hsl(var(--foreground) / 0.18))" }}
    >
      {/* Cartoon plane as SVG for cleaner shapes */}
      <svg className="absolute inset-0" viewBox="0 0 52 30" aria-hidden="true">
        <defs>
          <linearGradient id="planeBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="hsl(var(--secondary))" />
            <stop offset="1" stopColor="hsl(var(--card))" />
          </linearGradient>
          <linearGradient id="planeWing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" />
            <stop offset="1" stopColor="hsl(var(--primary) / 0.65)" />
          </linearGradient>

          {/* Fuselage clip for flag fill */}
          <clipPath id="fuselageClip">
            <path d="M9 18c-3.3 0-6-2-6-4.6C3 10.9 5.7 9 9 9h20c4.1 0 7.7 1.8 10.7 4.2l5.3 4.3c1.1.9.5 2.5-.9 2.5H29L14.8 21c-1.8-.6-3.7-1-5.8-1Z" />
          </clipPath>
        </defs>

        {/* fuselage */}
        <g clipPath="url(#fuselageClip)">
          <rect x="0" y="0" width="52" height="10" fill="hsl(var(--flag-red))" opacity="0.9" />
          <rect x="0" y="10" width="52" height="10" fill="hsl(var(--flag-white))" opacity="0.95" />
          <rect x="0" y="20" width="52" height="10" fill="hsl(var(--flag-green))" opacity="0.9" />
          <circle cx="28" cy="15" r="4.1" fill="hsl(var(--flag-sun))" opacity="0.75" />
          <rect x="0" y="0" width="52" height="30" fill="url(#planeBody)" opacity="0.28" />
        </g>
        <path
          d="M9 18c-3.3 0-6-2-6-4.6C3 10.9 5.7 9 9 9h20c4.1 0 7.7 1.8 10.7 4.2l5.3 4.3c1.1.9.5 2.5-.9 2.5H29L14.8 21c-1.8-.6-3.7-1-5.8-1Z"
          fill="none"
          stroke="hsl(var(--foreground) / 0.24)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* nose */}
        <path
          d="M45 17.8 39.4 13c-.7-.6-.2-1.8.7-1.8h4.6c1.7 0 3 1.3 3 3 0 1.3-.9 2.4-2.1 2.7Z"
          fill="hsl(var(--accent))"
          stroke="hsl(var(--foreground) / 0.22)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* cockpit */}
        <path
          d="M22 10.3c0-1.5 1.2-2.7 2.7-2.7h6.8c1.5 0 2.7 1.2 2.7 2.7v2.5c0 1.5-1.2 2.7-2.7 2.7h-6.8c-1.5 0-2.7-1.2-2.7-2.7v-2.5Z"
          fill="hsl(var(--card) / 0.95)"
          stroke="hsl(var(--foreground) / 0.16)"
          strokeWidth="1.1"
        />
        <path
          d="M24.2 9.8h7.7c.8 0 1.4.6 1.4 1.4v.8"
          fill="none"
          stroke="hsl(var(--primary) / 0.25)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* wing */}
        <path
          d="M20 16.8 34 16c1.2-.1 2.2.8 2.2 2v.2c0 1.3-1.1 2.3-2.4 2.2l-13.3-1c-1.7-.1-3-1.5-3-3.2v-.1c0-.8.7-1.4 1.5-1.4Z"
          fill="url(#planeWing)"
          stroke="hsl(var(--foreground) / 0.18)"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />

        {/* tail fin */}
        <path
          d="M10.5 9.3 16 6.7c.9-.4 1.9.2 1.9 1.2v3.6c0 1-.9 1.7-1.9 1.3l-5.5-2.1c-.6-.2-.8-.9-.5-1.4Z"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--foreground) / 0.18)"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />

        {/* engine ring */}
        <circle cx="40.3" cy="13.7" r="3.2" fill="hsl(var(--secondary) / 0.6)" stroke="hsl(var(--foreground) / 0.18)" strokeWidth="1" />
      </svg>

      {/* propeller (CSS animated) */}
      <div className="absolute right-[6px] top-[10px] h-[12px] w-[12px] rounded-full border bg-card shadow-soft">
        <div
          className={
            "absolute left-1/2 top-1/2 h-[2px] w-[16px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/30 " +
            (reducedMotion ? "" : "animate-[spin_700ms_linear_infinite]")
          }
        />
      </div>

      {/* Kurdistan flag mini-label on top */}
      <div className="absolute left-[22px] top-[-6px] h-[10px] w-[20px] overflow-hidden rounded-md border bg-card shadow-soft">
        <div className="absolute inset-x-0 top-0 h-1/3 bg-flag-red" />
        <div className="absolute inset-x-0 top-1/3 h-1/3 bg-flag-white" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-flag-green" />
        <div className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-flag-sun/80" />
      </div>
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
