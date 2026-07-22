import type { Segment } from "../types";

export interface KeyDecisionInput {
  key: string;
  isComposing?: boolean;
  compositionActive?: boolean;
  keyCode?: number;
  suppressAfterComposition?: boolean;
  segmentIsEmpty?: boolean;
}

export type KeyDecision =
  | "native"
  | "composition"
  | "suppress-enter"
  | "split"
  | "empty-enter"
  | "delete-empty";

export function decideEditorKey(input: KeyDecisionInput): KeyDecision {
  const composing =
    input.isComposing || input.compositionActive || input.keyCode === 229;

  if (input.key === "Enter") {
    if (composing) return "composition";
    if (input.suppressAfterComposition) return "suppress-enter";
    return input.segmentIsEmpty ? "empty-enter" : "split";
  }

  if (input.key === "Backspace" && input.segmentIsEmpty && !composing) {
    return "delete-empty";
  }

  return "native";
}

export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function getCharacterCount(value: string): number {
  return Array.from(value.replaceAll("\n", "")).length;
}

export interface SegmentEditResult {
  segments: Segment[];
  focusId: string;
  caret: number;
  changed: boolean;
}

export function splitSegmentAtCursor(
  segments: Segment[],
  segmentId: string,
  selectionStart: number,
  selectionEnd: number,
  newId: string,
): SegmentEditResult {
  const index = segments.findIndex((segment) => segment.id === segmentId);
  if (index < 0) {
    return { segments, focusId: segmentId, caret: 0, changed: false };
  }

  const current = segments[index];
  if (current.text.length === 0) {
    const next = segments[index + 1];
    return {
      segments,
      focusId: next?.id ?? current.id,
      caret: 0,
      changed: false,
    };
  }

  const start = Math.max(0, Math.min(selectionStart, current.text.length));
  const end = Math.max(start, Math.min(selectionEnd, current.text.length));
  const before = current.text.slice(0, start);
  const after = current.text.slice(end);
  const next: Segment = { id: newId, text: after };
  const updated = segments.slice();
  updated.splice(index, 1, { ...current, text: before }, next);

  return { segments: updated, focusId: newId, caret: 0, changed: true };
}

export function pasteMultilineAtCursor(
  segments: Segment[],
  segmentId: string,
  selectionStart: number,
  selectionEnd: number,
  clipboardText: string,
  makeId: () => string,
): SegmentEditResult {
  const normalized = normalizeNewlines(clipboardText);
  const index = segments.findIndex((segment) => segment.id === segmentId);
  if (index < 0 || !normalized.includes("\n")) {
    return { segments, focusId: segmentId, caret: selectionStart, changed: false };
  }

  const current = segments[index];
  const start = Math.max(0, Math.min(selectionStart, current.text.length));
  const end = Math.max(start, Math.min(selectionEnd, current.text.length));
  const rawLines = normalized.split("\n");
  rawLines[0] = current.text.slice(0, start) + rawLines[0];
  rawLines[rawLines.length - 1] += current.text.slice(end);

  const kept = rawLines.filter((line) => line.trim().length > 0);
  if (kept.length === 0) {
    const cleared = segments.slice();
    cleared[index] = { ...current, text: current.text.slice(0, start) + current.text.slice(end) };
    return {
      segments: cleared,
      focusId: current.id,
      caret: start,
      changed: true,
    };
  }

  const replacements = kept.map((text, replacementIndex) => ({
    id: replacementIndex === 0 ? current.id : makeId(),
    text,
  }));
  const updated = segments.slice();
  updated.splice(index, 1, ...replacements);
  const focused = replacements[replacements.length - 1];
  const suffixLength = current.text.length - end;

  return {
    segments: updated,
    focusId: focused.id,
    caret: Math.max(0, focused.text.length - suffixLength),
    changed: true,
  };
}

export function insertInternalLineBreak(text: string, start: number, end: number) {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  return {
    text: `${text.slice(0, safeStart)}\n${text.slice(safeEnd)}`,
    caret: safeStart + 1,
  };
}
