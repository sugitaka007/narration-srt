import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("PWAの開始URLとスコープはGitHub Pagesのサブパスに追従する", async () => {
  const [appConfig, viteConfig] = await Promise.all([
    readFile("app.config.json", "utf8").then(JSON.parse),
    readFile("vite.config.ts", "utf8"),
  ]);
  assert.equal(appConfig.name, "ゴロ寝動画台本");
  assert.equal(appConfig.tagline, "スマホで書いて、編集ソフトへ。");
  assert.match(viteConfig, /start_url: "\.\/"/);
  assert.match(viteConfig, /scope: "\.\/"/);
  assert.match(viteConfig, /src: "\.\/icon-192\.png"/);
});

test("アプリ名・説明・短いコピーは一つの設定ファイルから画面とmanifestへ渡す", async () => {
  const [appConfig, sourceConfig, indexHtml, viteConfig] = await Promise.all([
    readFile("app.config.json", "utf8").then(JSON.parse),
    readFile("src/config.ts", "utf8"),
    readFile("index.html", "utf8"),
    readFile("vite.config.ts", "utf8"),
  ]);
  assert.equal(typeof appConfig.name, "string");
  assert.match(sourceConfig, /appSettings\.name/);
  assert.match(sourceConfig, /appSettings\.tagline/);
  assert.match(indexHtml, /__APP_NAME__/);
  assert.match(viteConfig, /replaceAll\("__APP_NAME__"/);
  assert.match(viteConfig, /short_name: appSettings\.shortName/);
});

test("本番ビルドでハッシュ付きJS・CSSをService Workerへ注入できる", async () => {
  const [serviceWorker, injector, packageJson] = await Promise.all([
    readFile("public/sw.js", "utf8"),
    readFile("scripts/inject-sw-assets.mjs", "utf8"),
    readFile("package.json", "utf8"),
  ]);
  assert.match(serviceWorker, /\/\*__BUILD_ASSETS__\*\/ \[\]/);
  assert.match(serviceWorker, /self\.registration\.scope/);
  assert.match(injector, /source\.replace\(marker/);
  assert.match(packageJson, /node scripts\/inject-sw-assets\.mjs/);
});
