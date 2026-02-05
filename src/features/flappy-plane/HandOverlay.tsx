import { useEffect, useRef } from "react";
import { type Landmark, HAND_CONNECTIONS } from "./useHandY";

type Props = {
  landmarks: Landmark[] | undefined;
  videoRef: React.RefObject<HTMLVideoElement>;
};

// Colors for the hand skeleton
const JOINT_COLOR = "#00FF00";
const CONNECTION_COLOR = "#00CC00";
const JOINT_RADIUS = 4;
const LINE_WIDTH = 2;

export default function HandOverlay({ landmarks, videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video display size
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0) return;

    // Draw connections (bones)
    ctx.strokeStyle = CONNECTION_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = "round";

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (!start || !end) continue;

      ctx.beginPath();
      ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
      ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
      ctx.stroke();
    }

    // Draw joints (landmarks)
    ctx.fillStyle = JOINT_COLOR;
    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * canvas.width, lm.y * canvas.height, JOINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
