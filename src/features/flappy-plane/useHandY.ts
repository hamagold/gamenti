import { useEffect, useMemo, useRef, useState } from "react";
import { Hands, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export type HandTrackingState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "running"; y: number; confidence: number }
  | { status: "no_hand"; lastY: number }
  | { status: "error"; message: string };

type Options = {
  /** Prefer wrist landmark (0) or palm/hand center (averaged). */
  point?: "wrist" | "palm";
  /** Mirror camera (selfie) – matches user expectation for up/down. */
  selfieMode?: boolean;
  /** Smoothing factor [0..1] where higher is smoother (more lag). */
  smoothing?: number;
};

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Tracks the hand Y position (0..1) from the camera feed using MediaPipe Hands.
 * 0 = top of image, 1 = bottom of image.
 */
export function useHandY(videoRef: React.RefObject<HTMLVideoElement>, opts?: Options) {
  const options = useMemo(
    () => ({ point: "wrist", selfieMode: true, smoothing: 0.18, ...(opts ?? {}) }),
    [opts]
  );

  const [state, setState] = useState<HandTrackingState>({ status: "idle" });
  const lastYRef = useRef(0.5);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    setState({ status: "starting" });

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    handsRef.current = hands;

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
      selfieMode: options.selfieMode,
    });

    const onResults = (results: Results) => {
      if (cancelled) return;

      const lm = results.multiHandLandmarks?.[0];
      if (!lm) {
        setState({ status: "no_hand", lastY: lastYRef.current });
        return;
      }

      let y = 0.5;
      if (options.point === "wrist") {
        y = lm[0]?.y ?? 0.5;
      } else {
        // approximate palm center by averaging a few stable landmarks
        const indices = [0, 5, 9, 13, 17];
        const sum = indices.reduce((acc, idx) => acc + (lm[idx]?.y ?? 0.5), 0);
        y = sum / indices.length;
      }

      // Smooth (exponential moving average)
      const prev = lastYRef.current;
      const smooth = prev + (y - prev) * (1 - options.smoothing);
      const clamped = clamp01(smooth);
      lastYRef.current = clamped;

      // MediaPipe doesn't expose a per-frame confidence for Hands results consistently;
      // approximate confidence by presence of landmarks.
      const confidence = 1;
      setState({ status: "running", y: clamped, confidence });
    };

    hands.onResults(onResults);

    (async () => {
      try {
        // Start camera capture + feed frames into Hands
        const camera = new Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: 640,
          height: 480,
        });

        cameraRef.current = camera;
        await camera.start();
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Failed to access camera";
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
      try {
        cameraRef.current?.stop();
      } catch {
        // ignore
      }
      cameraRef.current = null;

      try {
        handsRef.current?.close();
      } catch {
        // ignore
      }
      handsRef.current = null;
    };
  }, [videoRef, options.point, options.selfieMode, options.smoothing]);

  return state;
}
