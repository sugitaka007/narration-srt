import { useState } from "react";
import {
  REWRITE_OPTION_LABELS,
  REWRITE_STRENGTH_LABELS,
} from "../config";
import { shareOrDownloadFile } from "../core/files";
import { createRewriteExchange, createRewriteFile } from "../core/rewrite";
import type {
  GptRewriteExchange,
  PendingReview,
  Project,
  RewriteOptionKey,
  RewritePreferences,
  RewriteRequestRecord,
} from "../types";
import { FlowHeader } from "./FlowHeader";
import { RewriteImportPanel } from "./RewriteImportPanel";

interface RewriteScreenProps {
  project: Project;
  saveState: "saved" | "saving" | "error";
  onHome: () => void;
  onBack: () => void;
  onSaveRequest: (record: RewriteRequestRecord, preferences: RewritePreferences) => void;
  onReview: (review: PendingReview) => void;
}

type DeliveryMessage = { tone: "success" | "neutral" | "error"; text: string } | null;

export function RewriteScreen({
  project,
  saveState,
  onHome,
  onBack,
  onSaveRequest,
  onReview,
}: RewriteScreenProps) {
  const [preferences, setPreferences] = useState<RewritePreferences>(() => ({
    ...project.rewritePreferences,
    targetAudience: "",
    selectedOptions: [...project.rewritePreferences.selectedOptions],
  }));
  const [generated, setGenerated] = useState<GptRewriteExchange | null>(null);
  const [message, setMessage] = useState<DeliveryMessage>(null);
  const [busy, setBusy] = useState(false);

  const toggleOption = (key: RewriteOptionKey) => {
    setPreferences((current) => ({
      ...current,
      selectedOptions: current.selectedOptions.includes(key)
        ? current.selectedOptions.filter((option) => option !== key)
        : [...current.selectedOptions, key],
    }));
  };

  const makeExchange = () => {
    const result = createRewriteExchange(project, preferences);
    onSaveRequest(result.record, preferences);
    setGenerated(result.exchange);
    return result.exchange;
  };

  const handleGenerateAndShare = async () => {
    setBusy(true);
    setMessage(null);
    const exchange = makeExchange();
    const file = createRewriteFile(exchange, project.title);
    const result = await shareOrDownloadFile(file, `${project.title} GPT修正用`);
    if (result.status === "shared") {
      setMessage({ tone: "success", text: "共有画面で送信先を選びました。" });
    } else if (result.status === "downloaded") {
      setMessage({ tone: "success", text: "共有に対応していないため、JSONをダウンロードしました。" });
    } else if (result.status === "cancelled") {
      setMessage({ tone: "neutral", text: "共有はキャンセルされました。ファイルはいつでも再作成できます。" });
    } else {
      setMessage({ tone: "error", text: result.message });
    }
    setBusy(false);
  };

  return (
    <main className="app-shell rewrite-shell">
      <FlowHeader active={2} saveState={saveState} onHome={onHome} />
      <button type="button" className="back-button" onClick={onBack}>← 仕上げへ戻る</button>
      <section className="screen-heading">
        <p className="eyebrow">有料APIは使いません</p>
        <h1>GPTへの修正内容</h1>
        <p>選んだ内容と、区切りを変えないための条件をJSONにまとめます。</p>
      </section>

      <section className="form-card">
        <fieldset>
          <legend>整えてほしい内容</legend>
          <div className="check-list">
            {(Object.entries(REWRITE_OPTION_LABELS) as [RewriteOptionKey, string][]).map(
              ([key, label]) => (
                <label key={key} className="check-row">
                  <input
                    type="checkbox"
                    checked={preferences.selectedOptions.includes(key)}
                    onChange={() => toggleOption(key)}
                  />
                  <span>{label}</span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>文章の変更量</legend>
          <div className="strength-options">
            {(Object.entries(REWRITE_STRENGTH_LABELS) as [RewritePreferences["strength"], string][]).map(
              ([key, label]) => (
                <label key={key} className="radio-card">
                  <input
                    type="radio"
                    name="rewrite-strength"
                    value={key}
                    checked={preferences.strength === key}
                    onChange={() => setPreferences((current) => ({ ...current, strength: key }))}
                  />
                  <span>
                    <strong>{label}</strong>
                    {key === "standard" ? <small>おすすめ</small> : null}
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <div className="optional-fields">
          <h2>任意の希望</h2>
          <label>
            <span>希望する口調や雰囲気</span>
            <input
              value={preferences.desiredTone}
              placeholder="例：落ち着いた、親しみやすい"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setPreferences((current) => ({ ...current, desiredTone: value }));
              }}
            />
          </label>
          <label>
            <span>GPTへ伝えたい追加の要望</span>
            <textarea
              rows={3}
              value={preferences.customInstruction}
              placeholder="空欄でも利用できます"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setPreferences((current) => ({ ...current, customInstruction: value }));
              }}
            />
          </label>
        </div>
      </section>

      <aside className="guard-note">
        <strong>字幕の個数・順番・固有IDは固定されます</strong>
        <span>GPTが変更できる場所は、修正後文章と処理状態だけです。</span>
      </aside>

      <div className="sticky-action-card">
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={handleGenerateAndShare}
        >
          {busy ? "JSONを準備中…" : "GPT修正用JSONを作成"}
        </button>
        {generated ? (
          <p className="share-instruction">
            このファイルをGPTへ添付して送信してください。依頼内容はファイル内に含まれているため、追加の命令入力は不要です。
          </p>
        ) : null}
        {message ? <p className={`status-message status-message--${message.tone}`} role="status">{message.text}</p> : null}
      </div>
      <RewriteImportPanel project={project} onReview={onReview} />
    </main>
  );
}
