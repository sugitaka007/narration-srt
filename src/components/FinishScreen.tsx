import type { PendingReview, Project } from "../types";
import { FlowHeader } from "./FlowHeader";
import { RewriteImportPanel } from "./RewriteImportPanel";

interface FinishScreenProps {
  project: Project;
  saveState: "saved" | "saving" | "error";
  onHome: () => void;
  onBack: () => void;
  onDirectSrt: () => void;
  onRewrite: () => void;
  onReview: (review: PendingReview) => void;
}

export function FinishScreen({
  project,
  saveState,
  onHome,
  onBack,
  onDirectSrt,
  onRewrite,
  onReview,
}: FinishScreenProps) {
  const filledCount = project.segments.filter((segment) => segment.text.trim()).length;

  return (
    <main className="app-shell finish-shell">
      <FlowHeader active={2} saveState={saveState} onHome={onHome} />
      <button type="button" className="back-button" onClick={onBack}>← 入力へ戻る</button>
      <section className="screen-heading">
        <p className="eyebrow">{filledCount}字幕を準備できました</p>
        <h1>どのように仕上げますか？</h1>
        <p>GPTを使わず、そのままSRTにすることもできます。</p>
      </section>

      <div className="finish-choices">
        <button type="button" className="choice-card choice-card--primary" onClick={onDirectSrt}>
          <span className="choice-number">A</span>
          <strong>このままSRTにする</strong>
          <small>入力した文章をそのまま書き出す</small>
          <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="choice-card" onClick={onRewrite}>
          <span className="choice-number">B</span>
          <strong>GPTで文章を整える</strong>
          <small>無料のJSONファイルで受け渡す</small>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <RewriteImportPanel project={project} onReview={onReview} />
    </main>
  );
}
