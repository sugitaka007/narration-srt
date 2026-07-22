import {
  APP_CONFIG,
  REWRITE_OPTION_LABELS,
  REWRITE_STRENGTH_LABELS,
} from "../config";
import type {
  GptRewriteExchange,
  PendingReview,
  Project,
  RewritePreferences,
  RewriteRequestRecord,
} from "../types";
import { createId } from "./ids";

const REQUIRED_RULES = [
  "文章全体を読んで前後関係を理解してから修正する",
  "元の意味、主張、事実関係を勝手に変えない",
  "元の文章に存在しない情報を追加しない",
  "人名、作品名、商品名、数値などを勝手に変更しない",
  "字幕の個数を変えない",
  "字幕の順番を変えない",
  "字幕を結合しない",
  "字幕を新しく分割しない",
  "字幕ごとの固有IDを変更しない",
  "字幕内改行の位置を追加、削除、移動しない",
  "修正の必要がない字幕は無理に変更しない",
  "sourceTextを一切変更せず、修正結果はrevisedTextだけに記入する",
  "修正不要の字幕でもrevisedTextへsourceTextと同じ文章を必ず記入する",
  "変更してよいのはsegments内のrevisedTextと、完了を示すstatusだけとする",
  "処理後はstatusをcompletedにする",
  "有効なJSON形式を維持する",
  "JSON以外の説明文やMarkdownのコードブロックを付けない",
  "修正済みJSONを、ダウンロード可能なJSONファイルとして返す",
] as const;

export function buildInstructionForGpt(preferences: RewritePreferences): string {
  const options = preferences.selectedOptions.length
    ? preferences.selectedOptions.map((key) => `・${REWRITE_OPTION_LABELS[key]}`).join("\n")
    : "・選択された個別項目なし（下記の変更量と必須条件だけに従う）";
  const strengthGuidance = {
    light: "必要最小限の修正にとどめ、語順や言い回しをできるだけ残す。",
    standard: "元の雰囲気を残しながら、分かりにくい部分や不自然な表現を整える。",
    active: "意味と事実を維持したまま、読みやすさと伝わりやすさを優先して積極的に整える。",
  }[preferences.strength];
  const optional = [
    preferences.desiredTone
      ? `希望する口調や雰囲気: ${preferences.desiredTone}`
      : "希望する口調や雰囲気: 指定なし",
    preferences.customInstruction
      ? `追加の要望: ${preferences.customInstruction}`
      : "追加の要望: 指定なし",
  ].join("\n");

  return [
    "あなたは動画ナレーション台本の文章校正者です。添付されたJSON内の字幕を、次の依頼に従って修正してください。",
    "",
    "【選択された修正内容】",
    options,
    "",
    `【文章の変更量】\n${REWRITE_STRENGTH_LABELS[preferences.strength]}: ${strengthGuidance}`,
    "",
    "【任意の希望】",
    optional,
    "",
    "【必ず守る条件】",
    REQUIRED_RULES.map((rule) => `・${rule}`).join("\n"),
  ].join("\n");
}

export function createRewriteExchange(
  project: Project,
  preferences: RewritePreferences,
  now = new Date(),
  requestId = createId("request"),
): { exchange: GptRewriteExchange; record: RewriteRequestRecord } {
  const createdAt = now.toISOString();
  const segments = project.segments.map((segment, index) => ({
    id: segment.id,
    order: index + 1,
    sourceText: segment.text,
    revisedText: "",
  }));
  const exchange: GptRewriteExchange = {
    format: APP_CONFIG.rewriteFormat,
    schemaVersion: APP_CONFIG.rewriteSchemaVersion,
    fileType: "gpt-rewrite-request",
    projectId: project.id,
    requestId,
    title: project.title,
    createdAt,
    rewriteRequest: {
      ...preferences,
      targetAudience: "",
      selectedOptions: [...preferences.selectedOptions],
      instructionForGPT: buildInstructionForGpt(preferences),
    },
    segments,
    status: "request",
  };

  return {
    exchange,
    record: {
      requestId,
      createdAt,
      segments: segments.map((segment) => ({ ...segment })),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export type RewriteValidationResult =
  | { ok: true; review: PendingReview }
  | { ok: false; errors: string[] };

export function validateRewriteExchange(
  value: unknown,
  project: Project,
): RewriteValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["JSONの最上位が正しいオブジェクトではありません。"] };
  }
  if (value.format !== APP_CONFIG.rewriteFormat) {
    errors.push("対応していないファイル形式です。formatを確認してください。");
  }
  if (value.schemaVersion !== APP_CONFIG.rewriteSchemaVersion) {
    errors.push("対応していないスキーマバージョンです。");
  }
  if (value.fileType !== "gpt-rewrite-request") {
    errors.push("GPT修正用JSONではありません。");
  }
  if (value.projectId !== project.id) {
    errors.push("別の台本用のJSONです。プロジェクトIDが一致しません。");
  }

  const request = project.lastRewriteRequest;
  if (!request) {
    errors.push("この台本には対応するGPT修正依頼の記録がありません。");
  } else if (value.requestId !== request.requestId) {
    errors.push("修正依頼IDが一致しません。最後に書き出したJSONを使用してください。");
  }
  if (value.status !== "completed") {
    errors.push("処理状態がcompletedになっていません。GPTの修正完了後のJSONを使用してください。");
  }
  if (!Array.isArray(value.segments)) {
    errors.push("segmentsが配列ではありません。");
  }
  if (errors.length > 0 || !request || !Array.isArray(value.segments)) {
    return { ok: false, errors };
  }

  if (value.segments.length !== request.segments.length) {
    errors.push("字幕の個数が修正依頼時から変更されています。");
  }
  const parsedSegments = value.segments;
  const comparableCount = Math.min(parsedSegments.length, request.segments.length);
  for (let index = 0; index < comparableCount; index += 1) {
    const candidate = parsedSegments[index];
    const original = request.segments[index];
    if (!isRecord(candidate)) {
      errors.push(`字幕${index + 1}のデータ形式が正しくありません。`);
      continue;
    }
    if (candidate.id !== original.id) {
      errors.push(`字幕${index + 1}の固有IDが変更されています。`);
    }
    if (candidate.order !== original.order) {
      errors.push(`字幕${index + 1}の順番が変更されています。`);
    }
    if (candidate.sourceText !== original.sourceText) {
      errors.push(`字幕${index + 1}の修正前文章（sourceText）が変更されています。`);
    }
    if (typeof candidate.revisedText !== "string") {
      errors.push(`字幕${index + 1}のrevisedTextが文字列ではありません。`);
    }
  }

  const currentIds = project.segments.map((segment) => segment.id);
  const requestIds = request.segments.map((segment) => segment.id);
  if (
    currentIds.length !== requestIds.length ||
    currentIds.some((id, index) => id !== requestIds[index])
  ) {
    errors.push(
      "JSON書き出し後にアプリ側で字幕の追加・削除・並べ替えが行われています。現在の台本から修正用JSONを作り直してください。",
    );
  }

  if (errors.length > 0) return { ok: false, errors };

  const exchange = value as unknown as GptRewriteExchange;
  const items = exchange.segments.map((segment, index) => {
    const currentText = project.segments[index].text;
    return {
      id: segment.id,
      order: segment.order,
      sourceText: segment.sourceText,
      currentText,
      revisedText: segment.revisedText,
      changed: segment.revisedText !== segment.sourceText,
      conflict: currentText !== segment.sourceText,
    };
  });

  return { ok: true, review: { exchange, items } };
}

export function parseAndValidateRewriteJson(
  text: string,
  project: Project,
): RewriteValidationResult {
  try {
    const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const trimmed = withoutBom.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    return validateRewriteExchange(JSON.parse(fenced ? fenced[1] : trimmed), project);
  } catch (error) {
    return {
      ok: false,
      errors: [
        `JSONを読み取れませんでした。${error instanceof Error ? ` ${error.message}` : ""}`.trim(),
      ],
    };
  }
}

export function createRewriteFile(exchange: GptRewriteExchange, title: string): File {
  const safeTitle = title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 90) || "名称未設定の台本";
  return new File([JSON.stringify(exchange, null, 2)], `${safeTitle}_GPT修正用.json`, {
    type: "application/json;charset=utf-8",
  });
}
