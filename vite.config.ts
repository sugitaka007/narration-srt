import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import appSettings from "./app.config.json";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const manifest = JSON.stringify(
  {
    name: appSettings.name,
    short_name: appSettings.shortName,
    description: appSettings.description,
    lang: "ja",
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: "any",
    background_color: "#0d1117",
    theme_color: "#425fd0",
    icons: [
      { src: "./icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "./icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  },
  null,
  2,
);

function appConfigPlugin(): Plugin {
  return {
    name: "subtitle-tsunagi-app-config",
    transformIndexHtml(html) {
      return html
        .replaceAll("__APP_NAME__", escapeHtml(appSettings.name))
        .replaceAll("__APP_DESCRIPTION__", escapeHtml(appSettings.description))
        .replaceAll("__APP_TAGLINE__", escapeHtml(appSettings.tagline));
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/manifest.webmanifest") {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
        response.end(manifest);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: manifest });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [appConfigPlugin(), react()],
  build: {
    target: "es2022",
  },
});
