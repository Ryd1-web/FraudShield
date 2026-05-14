import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

//const rawPort = process.env.PORT;

const rawPort = process.env.PORT || "5173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const rawBasePath = process.env.BASE_PATH || "/";
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  base: rawBasePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== "production" ? [runtimeErrorOverlay()] : []),
    ...(process.env.NODE_ENV === "production"
      ? [
          // Strip sourceMappingURL comments from dependencies so Vite
          // doesn't attempt to resolve broken original locations.
          {
            name: "strip-source-mapping-url",
            enforce: "pre",
            transform(code: string, id: string) {
              if (typeof code === "string" && code.indexOf("sourceMappingURL=") !== -1) {
                const cleaned = code.replace(/\/\/#[ \t]*sourceMappingURL=.*$/gm, "");
                return { code: cleaned, map: null };
              }
              return null;
            },
            renderChunk(code: string) {
              if (typeof code === "string" && code.indexOf("sourceMappingURL=") !== -1) {
                const cleaned = code.replace(/\/\/#[ \t]*sourceMappingURL=.*$/gm, "");
                return { code: cleaned, map: null };
              }
              return null;
            },
          },
        ]
      : []),
    ...(process.env.ANALYZE === "true"
      ? [
          await import("rollup-plugin-visualizer").then((m) =>
            m.visualizer({ filename: path.resolve(import.meta.dirname, "dist/stats.html"), gzipSize: true }),
          ),
        ]
      : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (
            id.includes("node_modules/chart") ||
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3") ||
            id.includes("node_modules/victory") ||
            id.includes("node_modules/chart.js") ||
            id.includes("node_modules/@nivo")
          ) {
            return "vendor-charts";
          }
          // Let Rollup decide on other node_modules to avoid circular chunk warnings
          return undefined;
        },
      },
    },
  },
  css: {
    devSourcemap: false,
  },

  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
