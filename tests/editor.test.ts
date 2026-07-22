import assert from "node:assert/strict";
import test from "node:test";
import {
  decideEditorKey,
  getCharacterCount,
  insertInternalLineBreak,
  pasteMultilineAtCursor,
  splitSegmentAtCursor,
} from "../src/core/editor";
import type { Segment } from "../src/types";

test("日本語IMEの変換中と変換確定直後はEnterで字幕を作らない", () => {
  assert.equal(
    decideEditorKey({ key: "Enter", isComposing: true, segmentIsEmpty: false }),
    "composition",
  );
  assert.equal(
    decideEditorKey({ key: "Enter", keyCode: 229, segmentIsEmpty: false }),
    "composition",
  );
  assert.equal(
    decideEditorKey({
      key: "Enter",
      suppressAfterComposition: true,
      segmentIsEmpty: false,
    }),
    "suppress-enter",
  );
});

test("変換中でないEnterはカーソル位置で二つの字幕へ分割する", () => {
  assert.equal(
    decideEditorKey({ key: "Enter", segmentIsEmpty: false }),
    "split",
  );
  const source: Segment[] = [{ id: "segment_a", text: "前半後半" }];
  const result = splitSegmentAtCursor(source, "segment_a", 2, 2, "segment_b");
  assert.deepEqual(result.segments, [
    { id: "segment_a", text: "前半" },
    { id: "segment_b", text: "後半" },
  ]);
  assert.equal(result.focusId, "segment_b");
  assert.equal(result.caret, 0);
});

test("末尾Enterは空の次字幕を一つだけ作り、空字幕のEnterは増殖させない", () => {
  const first = splitSegmentAtCursor(
    [{ id: "segment_a", text: "一つ目" }],
    "segment_a",
    3,
    3,
    "segment_b",
  );
  assert.equal(first.segments.length, 2);
  assert.equal(first.segments[1].text, "");

  const second = splitSegmentAtCursor(first.segments, "segment_b", 0, 0, "segment_c");
  assert.equal(second.changed, false);
  assert.equal(second.segments.length, 2);
  assert.equal(decideEditorKey({ key: "Enter", segmentIsEmpty: true }), "empty-enter");
  assert.equal(decideEditorKey({ key: "Backspace", segmentIsEmpty: true }), "delete-empty");
});

test("複数行貼り付けはCRLF・CR・LFの実改行だけを字幕境界にし、空行を作らない", () => {
  let next = 0;
  const result = pasteMultilineAtCursor(
    [{ id: "segment_a", text: "前後" }],
    "segment_a",
    1,
    1,
    "一行目\r\n\r\n二行目\r三行目",
    () => `segment_${++next}`,
  );
  assert.deepEqual(
    result.segments.map((segment) => segment.text),
    ["前一行目", "二行目", "三行目後"],
  );
  assert.equal(result.segments.length, 3);
  assert.equal(result.focusId, "segment_2");
});

test("長い一行や画面上の折り返しは字幕を分割しない", () => {
  const longLine = "長い文章です。".repeat(200);
  const result = pasteMultilineAtCursor(
    [{ id: "segment_a", text: "" }],
    "segment_a",
    0,
    0,
    longLine,
    () => "segment_b",
  );
  assert.equal(result.changed, false);
  assert.equal(result.segments.length, 1);
});

test("字幕内改行は明示操作でのみ挿入し、文字数からは除外する", () => {
  const result = insertInternalLineBreak("字幕本文", 2, 2);
  assert.equal(result.text, "字幕\n本文");
  assert.equal(result.caret, 3);
  assert.equal(getCharacterCount("字幕\n😊A"), 4);
});
