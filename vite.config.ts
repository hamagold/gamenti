import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Workaround for @mediapipe packages not exporting correctly with Vite bundler
// See: https://github.com/google-ai-edge/mediapipe/issues/4120
function mediapipeWorkaround() {
  return {
    name: "mediapipe_workaround",
    load(id: string) {
      const MEDIAPIPE_EXPORT_NAMES: Record<string, string[]> = {
        "hands.js": ["VERSION", "HAND_CONNECTIONS", "Hands"],
        "camera_utils.js": ["Camera"],
      };

      const fileName = path.basename(id);
      if (!(fileName in MEDIAPIPE_EXPORT_NAMES)) return null;

      let code = fs.readFileSync(id, "utf-8");
      for (const name of MEDIAPIPE_EXPORT_NAMES[fileName]) {
        code += `exports.${name} = ${name};`;
      }
      return { code };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    mediapipeWorkaround(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
