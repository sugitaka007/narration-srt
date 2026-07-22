import type { Project, Segment } from "../types";
import { FlowHeader } from "./FlowHeader";
import { SegmentEditor } from "./SegmentEditor";

interface EditorScreenProps {
  project: Project;
  saveState: "saved" | "saving" | "error";
  onHome: () => void;
  onTitleChange: (title: string) => void;
  onSegmentsChange: (updater: (segments: Segment[]) => Segment[]) => void;
  onFinish: () => void;
  onUndoImport: () => void;
}

export function EditorScreen({
  project,
  saveState,
  onHome,
  onTitleChange,
  onSegmentsChange,
  onFinish,
  onUndoImport,
}: EditorScreenProps) {
  const filledCount = project.segments.filter((segment) => segment.text.trim()).length;

  return (
    <main className="app-shell editor-shell">
      <FlowHeader active={1} saveState={saveState} onHome={onHome} />
      <section className="editor-intro">
        <label className="field-label" htmlFor="project-title">動画名・ファイル名</label>
        <input
          id="project-title"
          className="title-input"
          value={project.title}
          maxLength={120}
          placeholder="例：京都ひとり旅"
          onChange={(event) => onTitleChange(event.currentTarget.value)}
        />
        <p className="editor-hint">
          一つ書いて改行すると、次の字幕へ進みます。画面上の折り返しは字幕の区切りになりません。
        </p>
      </section>

      {project.undoSnapshot ? (
        <aside className="undo-banner">
          <div>
            <strong>GPT取り込み前の台本を保管中</strong>
            <span>現在の編集も含め、取り込み直前の状態へ戻せます。</span>
          </div>
          <button type="button" onClick={onUndoImport}>取り込み前へ戻す</button>
        </aside>
      ) : null}

      <SegmentEditor segments={project.segments} onSegmentsChange={onSegmentsChange} />

      <div className="editor-bottom-bar">
        <span>{filledCount}字幕</span>
        <button
          type="button"
          className="primary-button"
          disabled={filledCount === 0}
          onClick={onFinish}
        >
          仕上げへ
        </button>
      </div>
    </main>
  );
}
