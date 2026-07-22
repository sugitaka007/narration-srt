import { APP_CONFIG } from "../config";
import type { Project } from "../types";

interface ProjectHomeProps {
  projects: Project[];
  deletedTitle?: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRestoreDeleted: () => void;
}

function formatUpdatedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function ProjectHome({
  projects,
  deletedTitle,
  onCreate,
  onOpen,
  onDuplicate,
  onDelete,
  onRestoreDeleted,
}: ProjectHomeProps) {
  return (
    <main className="home-shell">
      <header className="home-header">
        <div>
          <p className="eyebrow">スマホで書いて、編集ソフトへ</p>
          <h1>{APP_CONFIG.name}</h1>
          <p>改行キーで字幕を一つずつ。文章はこの端末の中だけに保存されます。</p>
        </div>
        <button type="button" className="primary-button home-create" onClick={onCreate}>
          ＋ 新しい台本
        </button>
      </header>

      {projects.length === 0 ? (
        <section className="empty-state">
          <span className="empty-state__mark" aria-hidden="true">1</span>
          <h2>最初の字幕から始めましょう</h2>
          <p>動画名を付けたら、あとは一つ書いて改行するだけです。</p>
          <button type="button" className="primary-button" onClick={onCreate}>
            新しい台本を作成
          </button>
        </section>
      ) : (
        <section aria-labelledby="project-list-title">
          <div className="section-heading">
            <h2 id="project-list-title">この端末の台本</h2>
            <span>{projects.length}件</span>
          </div>
          <div className="project-grid">
            {projects.map((project) => {
              const filled = project.segments.filter((segment) => segment.text.trim()).length;
              return (
                <article className="project-card" key={project.id}>
                  <button
                    type="button"
                    className="project-card__open"
                    aria-label={`${project.title || "名称未設定"}を開く`}
                    onClick={() => onOpen(project.id)}
                  >
                    <strong>{project.title || "名称未設定"}</strong>
                    <span>{filled}字幕・{formatUpdatedAt(project.updatedAt)} 更新</span>
                  </button>
                  <div className="project-card__actions">
                    <button type="button" onClick={() => onDuplicate(project.id)}>
                      複製
                    </button>
                    <button type="button" className="danger-text" onClick={() => onDelete(project.id)}>
                      削除
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <p className="privacy-note">サーバーへの自動送信・アカウント登録・広告はありません。</p>

      {deletedTitle ? (
        <div className="undo-toast" role="status">
          <span>「{deletedTitle}」を削除しました</span>
          <button type="button" onClick={onRestoreDeleted}>元に戻す</button>
        </div>
      ) : null}
    </main>
  );
}
