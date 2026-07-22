import assert from "node:assert/strict";
import test from "node:test";
import { canShareFile, shareOrDownloadFile } from "../src/core/files";

const fakeFile = { name: "台本.srt" } as File;

test("ファイル共有に未対応なら通常ダウンロードへ切り替える", async () => {
  let downloaded = false;
  const result = await shareOrDownloadFile(
    fakeFile,
    "台本",
    {},
    () => { downloaded = true; },
  );
  assert.equal(canShareFile({}, fakeFile), false);
  assert.equal(result.status, "downloaded");
  assert.equal(downloaded, true);
});

test("Web Share APIで共有をキャンセルしても送信完了にしない", async () => {
  const result = await shareOrDownloadFile(
    fakeFile,
    "台本",
    {
      canShare: () => true,
      share: async () => { throw new DOMException("cancelled", "AbortError"); },
    },
    () => { throw new Error("ダウンロードへ切り替えてはいけません"); },
  );
  assert.equal(result.status, "cancelled");
});

test("Web Share APIの共有完了を識別する", async () => {
  const result = await shareOrDownloadFile(
    fakeFile,
    "台本",
    { canShare: () => true, share: async () => undefined },
    () => { throw new Error("ダウンロードへ切り替えてはいけません"); },
  );
  assert.equal(result.status, "shared");
});
