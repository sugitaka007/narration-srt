import { useRef, useState, type ChangeEvent } from "react";
import { parseAndValidateRewriteJson } from "../core/rewrite";
import type { PendingReview, Project } from "../types";
import { FlowHeader } from "./FlowHeader";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pastedJson, setPastedJson] = useState("");
  const filledCount = project.segments.filter((segment) => segment.text.trim()).length;

  const inspectJson = (text: string) => {
    const result = parseAndValidateRewriteJson(text, project);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onReview(result.review);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      inspectJson(await file.text());
    } catch {
      setErrors(["ファイルを読み取れませんでした。別のファイルを選んでください。"]);
    }
  };

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

      <section className="import-panel">
        <div>
          <h2>GPT修正済みJSONを読み込む</h2>
          <p>
            ID・順番・修正前文章を検証してから、差分確認画面を開きます。現在の台本はまだ変更しません。
          </p>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
        />
        <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>
          JSONファイルを選ぶ
        </button>

        {errors.length > 0 ? (
          <div className="error-panel" role="alert">
            <strong>台本は変更されていません</strong>
            <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        ) : null}

        <details className="fallback-details">
          <summary>ファイルを読み込めない場合</summary>
          <label className="field-label" htmlFor="pasted-json">JSONのコードだけを貼り付け</label>
          <textarea
            id="pasted-json"
            rows={5}
            value={pastedJson}
            placeholder="{ ... }"
            onChange={(event) => setPastedJson(event.currentTarget.value)}
          />
          <button
            type="button"
            className="small-button"
            disabled={!pastedJson.trim()}
            onClick={() => inspectJson(pastedJson)}
          >
            貼り付けたJSONを確認
          </button>
        </details>
      </section>
    </main>
  );
}
