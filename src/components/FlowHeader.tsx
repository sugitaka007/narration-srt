import { APP_CONFIG } from "../config";

interface FlowHeaderProps {
  active: 1 | 2 | 3;
  saveState?: "saved" | "saving" | "error";
  onHome: () => void;
}

export function FlowHeader({ active, saveState, onHome }: FlowHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__top">
        <button type="button" className="text-button" onClick={onHome}>
          台本一覧
        </button>
        <span className="app-name">{APP_CONFIG.name}</span>
        <span className={`save-state save-state--${saveState ?? "saved"}`} role="status">
          {saveState === "saving"
            ? "保存中"
            : saveState === "error"
              ? "保存できません"
              : "端末に保存済み"}
        </span>
      </div>
      <ol className="flow-steps" aria-label="作成の流れ">
        {["入力", "仕上げ", "送信"].map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3;
          return (
            <li key={label} className={step === active ? "is-active" : step < active ? "is-done" : ""}>
              <span>{step}</span>
              {label}
            </li>
          );
        })}
      </ol>
    </header>
  );
}
