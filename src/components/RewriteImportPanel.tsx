import { useId, useRef, useState, type ChangeEvent } from "react";
import { parseAndValidateRewriteJson } from "../core/rewrite";
import type { PendingReview, Project } from "../types";

interface RewriteImportPanelProps {
  project: Project;
  onReview: (review: PendingReview) => void;
}

export function RewriteImportPanel({ project, onReview }: RewriteImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pastedJsonId = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [pastedJson, setPastedJson] = useState("");

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
        <label className="field-label" htmlFor={pastedJsonId}>JSONのコードだけを貼り付け</label>
        <textarea
          id={pastedJsonId}
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
  );
}
