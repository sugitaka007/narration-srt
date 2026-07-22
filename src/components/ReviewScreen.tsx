import { useMemo, useState } from "react";
import type { PendingReview } from "../types";

interface ReviewScreenProps {
  review: PendingReview;
  onCancel: () => void;
  onApply: (selectedIds: Set<string>) => void;
}

export function ReviewScreen({ review, onCancel, onApply }: ReviewScreenProps) {
  const changedItems = useMemo(() => review.items.filter((item) => item.changed), [review]);
  const conflicts = useMemo(() => changedItems.filter((item) => item.conflict), [changedItems]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(changedItems.filter((item) => !item.conflict).map((item) => item.id)),
  );

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyAll = () => {
    if (
      conflicts.length > 0 &&
      !window.confirm(
        `${conflicts.length}件はJSON書き出し後にアプリ側で編集されています。GPTの文章で上書きしますか？`,
      )
    ) {
      return;
    }
    onApply(new Set(changedItems.map((item) => item.id)));
  };

  return (
    <main className="app-shell review-shell">
      <header className="review-header">
        <button type="button" className="back-button" onClick={onCancel}>← 取り込みをやめる</button>
        <span>差分確認</span>
      </header>
      <section className="screen-heading">
        <p className="eyebrow">台本はまだ変更されていません</p>
        <h1>{changedItems.length}件の字幕が変更されます</h1>
        <p>反映したい字幕だけを選べます。変更のない字幕は下にまとめています。</p>
      </section>

      {conflicts.length > 0 ? (
        <div className="conflict-summary" role="alert">
          <strong>{conflicts.length}件の競合があります</strong>
          <span>JSON書き出し後に編集した字幕です。初期状態では反映対象から外しています。</span>
        </div>
      ) : null}

      <div className="diff-list">
        {changedItems.map((item) => (
          <article key={item.id} className={`diff-card${item.conflict ? " diff-card--conflict" : ""}`}>
            <label className="diff-card__select">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span>字幕 {item.order} を反映</span>
              {item.conflict ? <strong>要確認</strong> : null}
            </label>
            {item.conflict ? (
              <div className="diff-block diff-block--current">
                <span>現在の文章（書き出し後に編集）</span>
                <p>{item.currentText}</p>
              </div>
            ) : (
              <div className="diff-block diff-block--before">
                <span>修正前</span>
                <p>{item.sourceText}</p>
              </div>
            )}
            <div className="diff-arrow" aria-hidden="true">↓</div>
            <div className="diff-block diff-block--after">
              <span>GPT修正後</span>
              <p>{item.revisedText}</p>
            </div>
          </article>
        ))}
      </div>

      {changedItems.length === 0 ? (
        <div className="empty-review">
          <strong>文章の変更はありません</strong>
          <p>すべてのrevisedTextが元の文章と同じでした。</p>
        </div>
      ) : null}

      <details className="unchanged-details">
        <summary>変更なしの字幕 {review.items.length - changedItems.length}件</summary>
        <ol>
          {review.items.filter((item) => !item.changed).map((item) => (
            <li key={item.id}><span>{item.order}</span>{item.sourceText || "（空の字幕）"}</li>
          ))}
        </ol>
      </details>

      <div className="review-actions">
        <button
          type="button"
          className="primary-button"
          disabled={selected.size === 0}
          onClick={() => onApply(selected)}
        >
          選択した{selected.size}件を反映
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={changedItems.length === 0}
          onClick={applyAll}
        >
          変更をすべて反映
        </button>
      </div>
    </main>
  );
}
