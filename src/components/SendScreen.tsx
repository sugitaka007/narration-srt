import { useMemo, useState } from "react";
import { downloadFile, shareOrDownloadFile } from "../core/files";
import { createSrtFile, generateSrt } from "../core/srt";
import type { ExportSettings, Project } from "../types";
import { FlowHeader } from "./FlowHeader";

interface SendScreenProps {
  project: Project;
  saveState: "saved" | "saving" | "error";
  onHome: () => void;
  onBack: () => void;
  onEdit: () => void;
  onSettingsChange: (settings: ExportSettings) => void;
}

type SendMessage = { tone: "success" | "neutral" | "error"; text: string } | null;

export function SendScreen({
  project,
  saveState,
  onHome,
  onBack,
  onEdit,
  onSettingsChange,
}: SendScreenProps) {
  const [settings, setSettings] = useState<ExportSettings>(() => ({ ...project.exportSettings }));
  const [message, setMessage] = useState<SendMessage>(null);
  const [busy, setBusy] = useState(false);
  const nonEmptyCount = useMemo(
    () => project.segments.filter((segment) => segment.text.trim().length > 0).length,
    [project.segments],
  );
  const totalSeconds = settings.durationSeconds * nonEmptyCount +
    settings.gapSeconds * Math.max(0, nonEmptyCount - 1);

  const updateSettings = (patch: Partial<ExportSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    onSettingsChange(next);
  };

  const buildFile = () => {
    const srt = generateSrt(project.segments, settings);
    return createSrtFile(project.title, srt);
  };

  const handleSend = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await shareOrDownloadFile(buildFile(), `${project.title} 字幕SRT`);
      if (result.status === "shared") {
        setMessage({ tone: "success", text: "共有画面で送信先を選びました。" });
      } else if (result.status === "downloaded") {
        setMessage({ tone: "success", text: "共有に対応していないため、SRTをダウンロードしました。" });
      } else if (result.status === "cancelled") {
        setMessage({ tone: "neutral", text: "共有はキャンセルされました。送信完了にはしていません。" });
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "SRTを作成できませんでした。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    try {
      downloadFile(buildFile());
      setMessage({ tone: "success", text: "UTF-8のSRTをダウンロードしました。" });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "SRTを作成できませんでした。",
      });
    }
  };

  return (
    <main className="app-shell send-shell">
      <FlowHeader active={3} saveState={saveState} onHome={onHome} />
      <button type="button" className="back-button" onClick={onBack}>← 仕上げへ戻る</button>
      <section className="screen-heading">
        <p className="eyebrow">標準SRT・UTF-8</p>
        <h1>パソコンに送る</h1>
        <p>{nonEmptyCount}字幕を、一つ3秒の仮時間で連続して書き出します。</p>
      </section>

      <section className="send-summary">
        <div>
          <span>ファイル名</span>
          <strong>{project.title || "名称未設定の台本"}.srt</strong>
        </div>
        <div>
          <span>仮の全体時間</span>
          <strong>約 {totalSeconds.toFixed(totalSeconds % 1 === 0 ? 0 : 1)} 秒</strong>
        </div>
      </section>

      <fieldset className="target-picker">
        <legend>読み込む編集ソフト</legend>
        <label>
          <input
            type="radio"
            name="editor-target"
            checked={settings.target === "davinci"}
            onChange={() => updateSettings({ target: "davinci" })}
          />
          <span>DaVinci Resolve</span>
        </label>
        <label>
          <input
            type="radio"
            name="editor-target"
            checked={settings.target === "premiere"}
            onChange={() => updateSettings({ target: "premiere" })}
          />
          <span>Premiere Pro</span>
        </label>
      </fieldset>

      <details className="advanced-settings">
        <summary>タイムコードの詳細設定</summary>
        <div className="settings-grid">
          <label>
            <span>一字幕の表示時間（秒）</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              inputMode="decimal"
              value={settings.durationSeconds}
              onChange={(event) => updateSettings({ durationSeconds: Number(event.currentTarget.value) })}
            />
          </label>
          <label>
            <span>字幕間の間隔（秒）</span>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={settings.gapSeconds}
              onChange={(event) => updateSettings({ gapSeconds: Number(event.currentTarget.value) })}
            />
          </label>
          <label>
            <span>開始時刻</span>
            <input
              type="text"
              inputMode="numeric"
              value={settings.startTimecode}
              pattern="[0-9]{2,}:[0-9]{2}:[0-9]{2},[0-9]{3}"
              placeholder="00:00:00,000"
              onChange={(event) => updateSettings({ startTimecode: event.currentTarget.value })}
            />
          </label>
        </div>
        <p>文字数による時間調整や字幕の再分割は行いません。</p>
      </details>

      <section className="send-actions">
        <button
          type="button"
          className="primary-button primary-button--large"
          disabled={busy || nonEmptyCount === 0}
          onClick={handleSend}
        >
          {busy ? "SRTを準備中…" : "パソコンに送る"}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={nonEmptyCount === 0}
          onClick={handleDownload}
        >
          SRTをダウンロード
        </button>
        <button type="button" className="text-button" onClick={onEdit}>文章をもう一度編集</button>
        {message ? <p className={`status-message status-message--${message.tone}`} role="status">{message.text}</p> : null}
      </section>

      <aside className="import-guide">
        <strong>{settings.target === "davinci" ? "DaVinci Resolveへ" : "Premiere Proへ"}</strong>
        <p>
          {settings.target === "davinci"
            ? "パソコンへ送ったSRTをメディアプールへ読み込み、タイムラインへ配置してください。"
            : "パソコンへ送ったSRTをプロジェクトへ読み込み、タイムラインへ配置してください。"}
        </p>
        <span>仮タイムコードは、映像と音声に合わせて編集ソフト側で調整できます。</span>
      </aside>
    </main>
  );
}
