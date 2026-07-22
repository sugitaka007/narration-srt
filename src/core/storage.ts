import { APP_CONFIG } from "../config";
import type {
  ExportSettings,
  Project,
  RewritePreferences,
  Segment,
  StoredAppState,
} from "../types";
import { createId } from "./ids";

export const DEFAULT_REWRITE_PREFERENCES: RewritePreferences = {
  strength: "standard",
  selectedOptions: ["typos", "clarity", "naturalSpeech", "narration"],
  targetAudience: "",
  desiredTone: "",
  customInstruction: "",
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  durationSeconds: 3,
  gapSeconds: 0,
  startTimecode: "00:00:00,000",
  target: "davinci",
};

export function createProject(title = "新しい動画", now = new Date()): Project {
  const timestamp = now.toISOString();
  return {
    id: createId("project"),
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    segments: [{ id: createId("segment"), text: "" }],
    rewritePreferences: { ...DEFAULT_REWRITE_PREFERENCES },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  };
}

export function createInitialState(): StoredAppState {
  return {
    version: APP_CONFIG.storageVersion,
    activeProjectId: null,
    projects: [],
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeSegments(value: unknown): Segment[] {
  if (!Array.isArray(value)) return [{ id: createId("segment"), text: "" }];
  const segments = value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: asString(item.id, createId("segment")),
      text: asString(item.text),
    }));
  return segments.length > 0 ? segments : [{ id: createId("segment"), text: "" }];
}

function normalizeProject(value: unknown): Project | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const now = new Date().toISOString();
  const rewrite =
    raw.rewritePreferences && typeof raw.rewritePreferences === "object"
      ? (raw.rewritePreferences as Partial<RewritePreferences>)
      : {};
  const exportSettings =
    raw.exportSettings && typeof raw.exportSettings === "object"
      ? (raw.exportSettings as Partial<ExportSettings>)
      : {};

  return {
    id: asString(raw.id, createId("project")),
    title: asString(raw.title, "名称未設定"),
    createdAt: asString(raw.createdAt, now),
    updatedAt: asString(raw.updatedAt, now),
    segments: normalizeSegments(raw.segments),
    rewritePreferences: {
      ...DEFAULT_REWRITE_PREFERENCES,
      ...rewrite,
      selectedOptions: Array.isArray(rewrite.selectedOptions)
        ? rewrite.selectedOptions
        : DEFAULT_REWRITE_PREFERENCES.selectedOptions,
    },
    exportSettings: {
      ...DEFAULT_EXPORT_SETTINGS,
      ...exportSettings,
    },
    ...(raw.lastRewriteRequest && typeof raw.lastRewriteRequest === "object"
      ? { lastRewriteRequest: raw.lastRewriteRequest as Project["lastRewriteRequest"] }
      : {}),
    ...(raw.undoSnapshot && typeof raw.undoSnapshot === "object"
      ? { undoSnapshot: raw.undoSnapshot as Project["undoSnapshot"] }
      : {}),
  };
}

export function migrateStoredState(value: unknown): StoredAppState {
  if (!value || typeof value !== "object") return createInitialState();
  const raw = value as Record<string, unknown>;
  const projects = Array.isArray(raw.projects)
    ? raw.projects.map(normalizeProject).filter((project): project is Project => project !== null)
    : [];
  const requestedActiveId = asString(raw.activeProjectId) || null;
  const activeProjectId = projects.some((project) => project.id === requestedActiveId)
    ? requestedActiveId
    : projects[0]?.id ?? null;

  return {
    version: APP_CONFIG.storageVersion,
    activeProjectId,
    projects,
  };
}

export function loadStoredState(storage: Pick<Storage, "getItem"> = localStorage): StoredAppState {
  try {
    const raw = storage.getItem(APP_CONFIG.storageKey);
    return raw ? migrateStoredState(JSON.parse(raw)) : createInitialState();
  } catch {
    return createInitialState();
  }
}

export function saveStoredState(
  state: StoredAppState,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
}

export function duplicateProject(project: Project, now = new Date()): Project {
  const timestamp = now.toISOString();
  return {
    ...project,
    id: createId("project"),
    title: `${project.title || "名称未設定"} のコピー`,
    createdAt: timestamp,
    updatedAt: timestamp,
    segments: project.segments.map((segment) => ({
      id: createId("segment"),
      text: segment.text,
    })),
    lastRewriteRequest: undefined,
    undoSnapshot: undefined,
  };
}
