import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type CompositionEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Segment } from "../types";
import {
  decideEditorKey,
  getCharacterCount,
  insertInternalLineBreak,
  normalizeNewlines,
  pasteMultilineAtCursor,
  splitSegmentAtCursor,
} from "../core/editor";
import { createId } from "../core/ids";
import { ensureFocusedControlVisible } from "../core/viewport";

type SegmentUpdater = (segments: Segment[]) => Segment[];
type SegmentCommand =
  | "merge-previous"
  | "merge-next"
  | "move-up"
  | "move-down"
  | "delete"
  | "duplicate";

interface SegmentCardProps {
  segment: Segment;
  index: number;
  total: number;
  previousId?: string;
  nextId?: string;
  registerRef: (id: string, node: HTMLTextAreaElement | null) => void;
  focusSegment: (id: string, caret?: number) => void;
  onTextChange: (id: string, text: string) => void;
  onSplit: (id: string, start: number, end: number) => void;
  onPasteLines: (
    id: string,
    start: number,
    end: number,
    clipboardText: string,
  ) => void;
  onDeleteEmpty: (id: string) => void;
  onCommand: (command: SegmentCommand, id: string) => void;
}

const SegmentCard = memo(function SegmentCard({
  segment,
  index,
  total,
  previousId,
  nextId,
  registerRef,
  focusSegment,
  onTextChange,
  onSplit,
  onPasteLines,
  onDeleteEmpty,
  onCommand,
}: SegmentCardProps) {
  const composingRef = useRef(false);
  const suppressEnterRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const selectionRef = useRef({ start: segment.text.length, end: segment.text.length });
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(
    () => () => {
      if (suppressTimerRef.current !== null) {
        window.clearTimeout(suppressTimerRef.current);
      }
    },
    [],
  );

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const rememberSelection = (node: HTMLTextAreaElement) => {
    selectionRef.current = {
      start: node.selectionStart ?? node.value.length,
      end: node.selectionEnd ?? node.value.length,
    };
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
    suppressEnterRef.current = false;
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLTextAreaElement>) => {
    composingRef.current = false;
    suppressEnterRef.current = true;
    rememberSelection(event.currentTarget);
    if (suppressTimerRef.current !== null) {
      window.clearTimeout(suppressTimerRef.current);
    }
    suppressTimerRef.current = window.setTimeout(() => {
      suppressEnterRef.current = false;
    }, 160);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const decision = decideEditorKey({
      key: event.key,
      isComposing: event.nativeEvent.isComposing,
      compositionActive: composingRef.current,
      keyCode: event.keyCode,
      suppressAfterComposition: suppressEnterRef.current,
      segmentIsEmpty: segment.text.length === 0,
    });

    if (decision === "composition" || decision === "native") return;
    event.preventDefault();

    if (decision === "suppress-enter") {
      suppressEnterRef.current = false;
      return;
    }
    if (decision === "empty-enter") {
      focusSegment(nextId ?? segment.id, 0);
      return;
    }
    if (decision === "delete-empty") {
      onDeleteEmpty(segment.id);
      return;
    }
    onSplit(
      segment.id,
      event.currentTarget.selectionStart ?? segment.text.length,
      event.currentTarget.selectionEnd ?? segment.text.length,
    );
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!normalizeNewlines(text).includes("\n")) return;
    event.preventDefault();
    onPasteLines(
      segment.id,
      event.currentTarget.selectionStart ?? segment.text.length,
      event.currentTarget.selectionEnd ?? segment.text.length,
      text,
    );
  };

  const handleInternalLineBreak = () => {
    const result = insertInternalLineBreak(
      segment.text,
      selectionRef.current.start,
      selectionRef.current.end,
    );
    onTextChange(segment.id, result.text);
    closeMenu();
    focusSegment(segment.id, result.caret);
  };

  const runCommand = (command: SegmentCommand) => {
    closeMenu();
    onCommand(command, segment.id);
  };

  return (
    <article className="segment-card" data-testid={`segment-${segment.id}`}>
      <div className="segment-card__meta">
        <span className="segment-number" aria-label={`字幕 ${index + 1}`}>
          {index + 1}
        </span>
        <span className="character-count">
          {getCharacterCount(segment.text)}文字
          {segment.text.includes("\n") ? `・${segment.text.split("\n").length}行` : ""}
        </span>
        <details className="segment-menu" ref={detailsRef}>
          <summary aria-label={`字幕 ${index + 1} の補助メニュー`}>•••</summary>
          <div className="segment-menu__panel">
            <button type="button" onClick={handleInternalLineBreak}>
              字幕内で改行
            </button>
            <button
              type="button"
              disabled={!previousId}
              onClick={() => runCommand("merge-previous")}
            >
              前の字幕と結合
            </button>
            <button
              type="button"
              disabled={!nextId}
              onClick={() => runCommand("merge-next")}
            >
              次の字幕と結合
            </button>
            <div className="menu-button-row">
              <button
                type="button"
                aria-label={`字幕 ${index + 1} を上へ移動`}
                disabled={index === 0}
                onClick={() => runCommand("move-up")}
              >
                ↑ 上へ
              </button>
              <button
                type="button"
                aria-label={`字幕 ${index + 1} を下へ移動`}
                disabled={index === total - 1}
                onClick={() => runCommand("move-down")}
              >
                ↓ 下へ
              </button>
            </div>
            <button type="button" onClick={() => runCommand("duplicate")}>
              複製
            </button>
            <button
              type="button"
              className="danger-text"
              onClick={() => runCommand("delete")}
            >
              削除
            </button>
          </div>
        </details>
      </div>
      <textarea
        ref={(node) => registerRef(segment.id, node)}
        className="segment-text"
        aria-label={`字幕 ${index + 1} の文章`}
        data-testid={`segment-input-${index + 1}`}
        rows={2}
        value={segment.text}
        placeholder={index === 0 ? "ここに一つ目の字幕を入力" : "次の字幕"}
        enterKeyHint="next"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck
        onChange={(event) => {
          onTextChange(segment.id, event.currentTarget.value.replace(/\r/g, ""));
          rememberSelection(event.currentTarget);
        }}
        onSelect={(event) => rememberSelection(event.currentTarget)}
        onFocus={(event) => {
          const node = event.currentTarget;
          rememberSelection(node);
          window.requestAnimationFrame(() => ensureFocusedControlVisible(node));
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    </article>
  );
});

interface SegmentEditorProps {
  segments: Segment[];
  onSegmentsChange: (updater: SegmentUpdater) => void;
}

export function SegmentEditor({ segments, onSegmentsChange }: SegmentEditorProps) {
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const listRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusRef = useRef<{ id: string; caret: number } | null>(null);
  const latestSegmentsRef = useRef(segments);
  latestSegmentsRef.current = segments;

  const registerRef = useCallback((id: string, node: HTMLTextAreaElement | null) => {
    if (node) refs.current.set(id, node);
    else refs.current.delete(id);
  }, []);

  const applyPendingFocus = useCallback(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const node = refs.current.get(pending.id);
    if (!node) return;
    node.focus({ preventScroll: true });
    const safeCaret = Math.max(0, Math.min(pending.caret, node.value.length));
    node.setSelectionRange(safeCaret, safeCaret);
    ensureFocusedControlVisible(node);
    pendingFocusRef.current = null;
  }, []);

  const focusSegment = useCallback(
    (id: string, caret = 0) => {
      pendingFocusRef.current = { id, caret };
      window.requestAnimationFrame(applyPendingFocus);
    },
    [applyPendingFocus],
  );

  useLayoutEffect(() => {
    applyPendingFocus();
  }, [segments, applyPendingFocus]);

  useEffect(() => {
    const closeMenusOutside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return;
      const openMenus = listRef.current?.querySelectorAll<HTMLDetailsElement>(
        ".segment-menu[open]",
      );
      openMenus?.forEach((menu) => {
        if (!menu.contains(target)) menu.open = false;
      });
    };
    const handlePointerDown = (event: PointerEvent) => closeMenusOutside(event.target);
    const handleFocusIn = (event: FocusEvent) => closeMenusOutside(event.target);
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      listRef.current
        ?.querySelectorAll<HTMLDetailsElement>(".segment-menu[open]")
        .forEach((menu) => { menu.open = false; });
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, []);

  const commitSegments = useCallback(
    (next: Segment[]) => {
      latestSegmentsRef.current = next;
      onSegmentsChange(() => next);
    },
    [onSegmentsChange],
  );

  const onTextChange = useCallback(
    (id: string, text: string) => {
      commitSegments(
        latestSegmentsRef.current.map((segment) =>
          segment.id === id ? { ...segment, text } : segment,
        ),
      );
    },
    [commitSegments],
  );

  const onSplit = useCallback(
    (id: string, start: number, end: number) => {
      const newId = createId("segment");
      const result = splitSegmentAtCursor(
        latestSegmentsRef.current,
        id,
        start,
        end,
        newId,
      );
      commitSegments(result.segments);
      focusSegment(result.focusId, result.caret);
    },
    [commitSegments, focusSegment],
  );

  const onPasteLines = useCallback(
    (id: string, start: number, end: number, clipboardText: string) => {
      const result = pasteMultilineAtCursor(
        latestSegmentsRef.current,
        id,
        start,
        end,
        clipboardText,
        () => createId("segment"),
      );
      if (result.changed) commitSegments(result.segments);
      focusSegment(result.focusId, result.caret);
    },
    [commitSegments, focusSegment],
  );

  const onDeleteEmpty = useCallback(
    (id: string) => {
      const current = latestSegmentsRef.current;
      const index = current.findIndex((segment) => segment.id === id);
      if (index < 0 || current[index].text.length > 0 || current.length === 1) {
        focusSegment(id, 0);
        return;
      }
      const previous = current[index - 1] ?? current[index + 1];
      commitSegments(current.filter((segment) => segment.id !== id));
      focusSegment(previous.id, previous.text.length);
    },
    [commitSegments, focusSegment],
  );

  const onCommand = useCallback(
    (command: SegmentCommand, id: string) => {
      const current = latestSegmentsRef.current;
      const index = current.findIndex((segment) => segment.id === id);
      if (index < 0) return;
      const updated = current.slice();
      const segment = current[index];
      let focusId = id;
      let caret = segment.text.length;

      if (command === "merge-previous" && index > 0) {
        const previous = current[index - 1];
        focusId = previous.id;
        caret = previous.text.length;
        updated.splice(index - 1, 2, {
          ...previous,
          text: previous.text + segment.text,
        });
      } else if (command === "merge-next" && index < current.length - 1) {
        const next = current[index + 1];
        caret = segment.text.length;
        updated.splice(index, 2, { ...segment, text: segment.text + next.text });
      } else if (command === "move-up" && index > 0) {
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      } else if (command === "move-down" && index < current.length - 1) {
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      } else if (command === "duplicate") {
        const duplicated = { id: createId("segment"), text: segment.text };
        focusId = duplicated.id;
        caret = duplicated.text.length;
        updated.splice(index + 1, 0, duplicated);
      } else if (command === "delete") {
        if (current.length === 1) {
          caret = 0;
          updated.splice(0, 1, { ...segment, text: "" });
        } else {
          const target = current[index - 1] ?? current[index + 1];
          focusId = target.id;
          caret = target.text.length;
          updated.splice(index, 1);
        }
      } else {
        return;
      }

      commitSegments(updated);
      focusSegment(focusId, caret);
    },
    [commitSegments, focusSegment],
  );

  return (
    <div className="segment-list" aria-label="字幕一覧" ref={listRef}>
      {segments.map((segment, index) => (
        <SegmentCard
          key={segment.id}
          segment={segment}
          index={index}
          total={segments.length}
          previousId={segments[index - 1]?.id}
          nextId={segments[index + 1]?.id}
          registerRef={registerRef}
          focusSegment={focusSegment}
          onTextChange={onTextChange}
          onSplit={onSplit}
          onPasteLines={onPasteLines}
          onDeleteEmpty={onDeleteEmpty}
          onCommand={onCommand}
        />
      ))}
    </div>
  );
}
