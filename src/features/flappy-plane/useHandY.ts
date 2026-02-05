import { useEffect, useMemo, useRef, useState } from "react";
import { Hands, type Results, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export type Landmark = { x: number; y: number; z: number };

export type HandTrackingState =
  | { status: "idle"; landmarks?: undefined }
  | { status: "starting"; landmarks?: undefined }
  | { status: "running"; y: number; confidence: number; landmarks: Landmark[] }
  | { status: "no_hand"; lastY: number; landmarks?: undefined }
  | { status: "error"; message: string; landmarks?: undefined };

type Options = {
  /** Prefer wrist landmark (0) or palm/hand center (averaged). */
  point?: "wrist" | "palm";
  /** Mirror camera (selfie) – matches user expectation for up/down. */
  selfieMode?: boolean;
  /** Smoothing factor [0..1] where higher is smoother (more lag). */
  smoothing?: number;
  /** Change this value to force MediaPipe + camera to restart. */
  restartToken?: number;
};

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

// Export HAND_CONNECTIONS for drawing
export { HAND_CONNECTIONS };

/**
 * Tracks the hand Y position (0..1) from the camera feed using MediaPipe Hands.
 * 0 = top of image, 1 = bottom of image.
 */
export function useHandY(videoRef: React.RefObject<HTMLVideoElement>, opts?: Options) {
  // IMPORTANT: don't depend on the whole `opts` object identity, otherwise React re-renders
  // would recreate MediaPipe instances and can crash the WASM runtime.
  const options = useMemo(
    () => ({ point: "wrist", selfieMode: true, smoothing: 0.18, ...(opts ?? {}) }),
    [opts?.point, opts?.selfieMode, opts?.smoothing, opts?.restartToken]
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
      
      // Convert landmarks to simple array
      const landmarks: Landmark[] = lm.map((l) => ({ x: l.x, y: l.y, z: l.z }));
      
      setState({ status: "running", y: clamped, confidence, landmarks });
    };

    hands.onResults(onResults);

    (async () => {
      try {
        // Start camera capture + feed frames into Hands
        const camera = new Camera(video, {
          onFrame: async () => {
            if (cancelled) return;
            try {
              await hands.send({ image: video });
            } catch {
              // MediaPipe can throw during teardown or if the WASM runtime aborts.
              // Avoid unhandled promise rejections.
            }
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
  }, [options.point, options.selfieMode, options.smoothing, options.restartToken]);

  return state;
}
