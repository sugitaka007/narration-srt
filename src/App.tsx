import { useCallback, useEffect, useRef, useState } from "react";
import { EditorScreen } from "./components/EditorScreen";
import { FinishScreen } from "./components/FinishScreen";
import { ProjectHome } from "./components/ProjectHome";
import { ReviewScreen } from "./components/ReviewScreen";
import { RewriteScreen } from "./components/RewriteScreen";
import { SendScreen } from "./components/SendScreen";
import {
  createInitialState,
  createProject,
  duplicateProject,
  loadStoredState,
  saveStoredState,
} from "./core/storage";
import {
  ensureFocusedControlVisible,
  isSoftwareKeyboardOpen,
} from "./core/viewport";
import type {
  ExportSettings,
  PendingReview,
  Project,
  RewritePreferences,
  RewriteRequestRecord,
  Segment,
  StoredAppState,
} from "./types";

type AppView = "home" | "editor" | "finish" | "rewrite" | "review" | "send";

interface DeletedProject {
  project: Project;
  index: number;
}

export default function App() {
  const [appState, setAppState] = useState<StoredAppState>(() => loadStoredState());
  const [view, setView] = useState<AppView>(() =>
    appState.projects.length > 0 ? "editor" : "home",
  );
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [deleted, setDeleted] = useState<DeletedProject | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const latestStateRef = useRef(appState);
  const noticeTimerRef = useRef<number | null>(null);

  latestStateRef.current = appState;
  const activeProject = appState.projects.find(
    (project) => project.id === appState.activeProjectId,
  );

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4_500);
  }, []);

  useEffect(() => {
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        saveStoredState(appState);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 240);
    return () => window.clearTimeout(timer);
  }, [appState]);

  useEffect(() => {
    const saveNow = () => {
      try {
        saveStoredState(latestStateRef.current);
      } catch {
        setSaveState("error");
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const syncViewport = () => {
      const keyboardOpen = isSoftwareKeyboardOpen(window.innerHeight, viewport.height);
      document.documentElement.classList.toggle("is-keyboard-open", keyboardOpen);
      if (keyboardOpen) {
        window.requestAnimationFrame(() => {
          const active = document.activeElement;
          if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
            ensureFocusedControlVisible(active);
          }
        });
      }
    };
    syncViewport();
    viewport.addEventListener("resize", syncViewport);
    return () => {
      viewport.removeEventListener("resize", syncViewport);
      document.documentElement.classList.remove("is-keyboard-open");
    };
  }, []);

  useEffect(
    () => () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  const updateActiveProject = useCallback((updater: (project: Project) => Project) => {
    setAppState((current) => {
      const activeId = current.activeProjectId;
      if (!activeId) return current;
      let changed = false;
      const projects = current.projects.map((project) => {
        if (project.id !== activeId) return project;
        changed = true;
        return { ...updater(project), updatedAt: new Date().toISOString() };
      });
      return changed ? { ...current, projects } : current;
    });
  }, []);

  const handleCreate = () => {
    const project = createProject();
    setAppState((current) => ({
      ...current,
      activeProjectId: project.id,
      projects: [project, ...current.projects],
    }));
    setDeleted(null);
    setView("editor");
  };

  const handleOpen = (id: string) => {
    setAppState((current) => ({ ...current, activeProjectId: id }));
    setView("editor");
  };

  const handleDuplicate = (id: string) => {
    const source = appState.projects.find((project) => project.id === id);
    if (!source) return;
    const copy = duplicateProject(source);
    setAppState((current) => ({
      ...current,
      activeProjectId: copy.id,
      projects: [copy, ...current.projects],
    }));
    showNotice("台本を複製しました。");
  };

  const handleDelete = (id: string) => {
    setAppState((current) => {
      const index = current.projects.findIndex((project) => project.id === id);
      if (index < 0) return current;
      setDeleted({ project: current.projects[index], index });
      const projects = current.projects.filter((project) => project.id !== id);
      const activeProjectId =
        current.activeProjectId === id
          ? projects[Math.min(index, Math.max(0, projects.length - 1))]?.id ?? null
          : current.activeProjectId;
      return { ...current, projects, activeProjectId };
    });
  };

  const handleRestoreDeleted = () => {
    if (!deleted) return;
    setAppState((current) => {
      const projects = current.projects.slice();
      projects.splice(Math.min(deleted.index, projects.length), 0, deleted.project);
      return { ...current, projects };
    });
    setDeleted(null);
    showNotice("削除した台本を元に戻しました。");
  };

  const handleTitleChange = useCallback(
    (title: string) => updateActiveProject((project) => ({ ...project, title })),
    [updateActiveProject],
  );

  const handleSegmentsChange = useCallback(
    (updater: (segments: Segment[]) => Segment[]) =>
      updateActiveProject((project) => ({ ...project, segments: updater(project.segments) })),
    [updateActiveProject],
  );

  const handleSaveRequest = useCallback(
    (record: RewriteRequestRecord, preferences: RewritePreferences) =>
      updateActiveProject((project) => ({
        ...project,
        rewritePreferences: { ...preferences, selectedOptions: [...preferences.selectedOptions] },
        lastRewriteRequest: record,
      })),
    [updateActiveProject],
  );

  const handleSettingsChange = useCallback(
    (settings: ExportSettings) =>
      updateActiveProject((project) => ({ ...project, exportSettings: settings })),
    [updateActiveProject],
  );

  const handleReview = (review: PendingReview) => {
    setPendingReview(review);
    setView("review");
  };

  const handleApplyReview = (selectedIds: Set<string>) => {
    if (!pendingReview) return;
    const revisedById = new Map(
      pendingReview.items
        .filter((item) => selectedIds.has(item.id))
        .map((item) => [item.id, item.revisedText]),
    );
    updateActiveProject((project) => ({
      ...project,
      undoSnapshot: {
        createdAt: new Date().toISOString(),
        reason: "gpt-import",
        segments: project.segments.map((segment) => ({ ...segment })),
      },
      segments: project.segments.map((segment) =>
        revisedById.has(segment.id)
          ? { ...segment, text: revisedById.get(segment.id) ?? segment.text }
          : segment,
      ),
    }));
    const count = revisedById.size;
    setPendingReview(null);
    setView("editor");
    showNotice(`${count}件のGPT修正を反映しました。`);
  };

  const handleUndoImport = () => {
    updateActiveProject((project) => {
      if (!project.undoSnapshot) return project;
      return {
        ...project,
        segments: project.undoSnapshot.segments.map((segment) => ({ ...segment })),
        undoSnapshot: undefined,
      };
    });
    showNotice("GPT取り込み前の台本へ戻しました。");
  };

  if (view === "home" || !activeProject) {
    return (
      <>
        <ProjectHome
          projects={appState.projects}
          deletedTitle={deleted?.project.title}
          onCreate={handleCreate}
          onOpen={handleOpen}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onRestoreDeleted={handleRestoreDeleted}
        />
        {notice ? <div className="notice-toast" role="status">{notice}</div> : null}
      </>
    );
  }

  return (
    <>
      {view === "editor" ? (
        <EditorScreen
          project={activeProject}
          saveState={saveState}
          onHome={() => setView("home")}
          onTitleChange={handleTitleChange}
          onSegmentsChange={handleSegmentsChange}
          onFinish={() => setView("finish")}
          onUndoImport={handleUndoImport}
        />
      ) : null}
      {view === "finish" ? (
        <FinishScreen
          project={activeProject}
          saveState={saveState}
          onHome={() => setView("home")}
          onBack={() => setView("editor")}
          onDirectSrt={() => setView("send")}
          onRewrite={() => setView("rewrite")}
          onReview={handleReview}
        />
      ) : null}
      {view === "rewrite" ? (
        <RewriteScreen
          key={activeProject.id}
          project={activeProject}
          saveState={saveState}
          onHome={() => setView("home")}
          onBack={() => setView("finish")}
          onSaveRequest={handleSaveRequest}
          onReview={handleReview}
        />
      ) : null}
      {view === "review" && pendingReview ? (
        <ReviewScreen
          review={pendingReview}
          onCancel={() => {
            setPendingReview(null);
            setView("finish");
          }}
          onApply={handleApplyReview}
        />
      ) : null}
      {view === "send" ? (
        <SendScreen
          key={activeProject.id}
          project={activeProject}
          saveState={saveState}
          onHome={() => setView("home")}
          onBack={() => setView("finish")}
          onEdit={() => setView("editor")}
          onSettingsChange={handleSettingsChange}
        />
      ) : null}
      {notice ? <div className="notice-toast" role="status">{notice}</div> : null}
    </>
  );
}

export function resetAppForTests(): StoredAppState {
  return createInitialState();
}
