import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimecode,
  generateSrt,
  parseTimecode,
  sanitizeFileBaseName,
} from "../src/core/srt";
import type { ExportSettings, Segment } from "../src/types";

const settings: ExportSettings = {
  durationSeconds: 3,
  gapSeconds: 0.25,
  startTimecode: "00:00:01,500",
  target: "davinci",
};

test("SRTタイムコードをミリ秒まで正確に連続生成する", () => {
  const segments: Segment[] = [
    { id: "a", text: "こんにちは" },
    { id: "empty", text: "   " },
    { id: "b", text: "二行目\n字幕😊" },
  ];
  const srt = generateSrt(segments, settings);
  assert.equal(
    srt,
    "1\r\n00:00:01,500 --> 00:00:04,500\r\nこんにちは\r\n\r\n" +
      "2\r\n00:00:04,750 --> 00:00:07,750\r\n二行目\r\n字幕😊\r\n",
  );
});

test("時刻の解析・整形はHH:MM:SS,mmm形式を守る", () => {
  assert.equal(parseTimecode("01:02:03,004"), 3_723_004);
  assert.equal(parseTimecode("00:00:60,000"), null);
  assert.equal(formatTimecode(3_723_004), "01:02:03,004");
});

test("数百字幕でも一項目を一つのSRT字幕として保つ", () => {
  const segments = Array.from({ length: 500 }, (_, index) => ({
    id: `segment_${index}`,
    text: `自動分割しない長い一行 ${index} ${"あ".repeat(120)}`,
  }));
  const srt = generateSrt(segments, { ...settings, gapSeconds: 0, startTimecode: "00:00:00,000" });
  assert.match(srt, /^1\r\n00:00:00,000 --> 00:00:03,000/m);
  assert.match(srt, /500\r\n00:24:57,000 --> 00:25:00,000/);
  assert.equal((srt.match(/ --> /g) ?? []).length, 500);
});

test("ファイル名に使えない文字を安全に置換する", () => {
  assert.equal(sanitizeFileBaseName('動画:タイトル/第1話?*'), "動画_タイトル_第1話__");
  assert.equal(sanitizeFileBaseName("...   "), "名称未設定の台本");
});
