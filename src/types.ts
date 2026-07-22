import type {
  REWRITE_OPTION_LABELS,
  REWRITE_STRENGTH_LABELS,
} from "./config";

export type RewriteOptionKey = keyof typeof REWRITE_OPTION_LABELS;
export type RewriteStrength = keyof typeof REWRITE_STRENGTH_LABELS;
export type EditorTarget = "davinci" | "premiere";

export interface Segment {
  id: string;
  text: string;
}

export interface RewritePreferences {
  strength: RewriteStrength;
  selectedOptions: RewriteOptionKey[];
  targetAudience: string;
  desiredTone: string;
  customInstruction: string;
}

export interface ExportSettings {
  durationSeconds: number;
  gapSeconds: number;
  startTimecode: string;
  target: EditorTarget;
}

export interface ExchangeSegment {
  id: string;
  order: number;
  sourceText: string;
  revisedText: string;
}

export interface GptRewriteExchange {
  format: "narration-rewrite-exchange";
  schemaVersion: 1;
  fileType: "gpt-rewrite-request";
  projectId: string;
  requestId: string;
  title: string;
  createdAt: string;
  rewriteRequest: {
    strength: RewriteStrength;
    selectedOptions: RewriteOptionKey[];
    targetAudience: string;
    desiredTone: string;
    customInstruction: string;
    instructionForGPT: string;
  };
  segments: ExchangeSegment[];
  status: "request" | "completed";
}

export interface RewriteRequestRecord {
  requestId: string;
  createdAt: string;
  segments: ExchangeSegment[];
}

export interface UndoSnapshot {
  createdAt: string;
  reason: "gpt-import";
  segments: Segment[];
}

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  segments: Segment[];
  rewritePreferences: RewritePreferences;
  exportSettings: ExportSettings;
  lastRewriteRequest?: RewriteRequestRecord;
  undoSnapshot?: UndoSnapshot;
}

export interface StoredAppState {
  version: 1;
  activeProjectId: string | null;
  projects: Project[];
}

export interface ReviewItem {
  id: string;
  order: number;
  sourceText: string;
  currentText: string;
  revisedText: string;
  changed: boolean;
  conflict: boolean;
}

export interface PendingReview {
  exchange: GptRewriteExchange;
  items: ReviewItem[];
}
