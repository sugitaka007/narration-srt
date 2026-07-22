import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("初期画面の台本追加操作は一つだけで、不要な説明を表示しない", async () => {
  const source = await readFile("src/components/ProjectHome.tsx", "utf8");
  assert.equal(source.match(/onClick=\{onCreate\}/g)?.length, 1);
  assert.doesNotMatch(source, /改行キーで字幕を一つずつ/);
  assert.match(source, /APP_CONFIG\.tagline/);
});

test("GPT修正画面は視聴者欄と個別ダウンロードを廃止し、共通読込機能を使う", async () => {
  const [rewriteSource, finishSource] = await Promise.all([
    readFile("src/components/RewriteScreen.tsx", "utf8"),
    readFile("src/components/FinishScreen.tsx", "utf8"),
  ]);
  assert.doesNotMatch(rewriteSource, /想定する視聴者/);
  assert.doesNotMatch(rewriteSource, />\s*JSONをダウンロード\s*</);
  assert.match(rewriteSource, /<RewriteImportPanel/);
  assert.match(finishSource, /<RewriteImportPanel/);
});

test("字幕メニューは外側タップで閉じ、入力フォーカスで中央へ強制スクロールしない", async () => {
  const [editorSource, appSource, styles] = await Promise.all([
    readFile("src/components/SegmentEditor.tsx", "utf8"),
    readFile("src/App.tsx", "utf8"),
    readFile("src/styles.css", "utf8"),
  ]);
  assert.match(editorSource, /addEventListener\("pointerdown"/);
  assert.doesNotMatch(editorSource, /scrollIntoView/);
  assert.doesNotMatch(appSource, /viewport\.addEventListener\("scroll"/);
  assert.match(styles, /\.is-keyboard-open \.editor-bottom-bar/);
});
