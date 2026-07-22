import assert from "node:assert/strict";
import test from "node:test";
import {
  getFocusScrollAdjustment,
  isSoftwareKeyboardOpen,
} from "../src/core/viewport";

test("ソフトウェアキーボードはVisual Viewportの縮小だけで判定する", () => {
  assert.equal(isSoftwareKeyboardOpen(844, 844), false);
  assert.equal(isSoftwareKeyboardOpen(844, 760), false);
  assert.equal(isSoftwareKeyboardOpen(844, 500), true);
});

test("入力欄が見えている場合はスクロールせず、隠れた分だけ最小移動する", () => {
  assert.equal(getFocusScrollAdjustment({
    elementTop: 120,
    elementBottom: 210,
    viewportTop: 40,
    viewportHeight: 460,
  }), 0);
  assert.equal(getFocusScrollAdjustment({
    elementTop: 460,
    elementBottom: 540,
    viewportTop: 40,
    viewportHeight: 460,
  }), 58);
  assert.equal(getFocusScrollAdjustment({
    elementTop: 30,
    elementBottom: 100,
    viewportTop: 40,
    viewportHeight: 460,
  }), -22);
});
