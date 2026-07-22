import appSettings from "../app.config.json";

export const APP_CONFIG = {
  name: appSettings.name,
  storageKey: "subtitle-tsunagi:state",
  storageVersion: 1,
  rewriteFormat: "narration-rewrite-exchange",
  rewriteSchemaVersion: 1,
} as const;

export const REWRITE_OPTION_LABELS = {
  typos: "誤字、脱字、助詞の誤りを直す",
  clarity: "意味が伝わりにくい文章を明確にする",
  naturalSpeech: "話し言葉として自然にする",
  narration: "ナレーションとして読み上げやすくする",
  concise: "長く重複した表現を簡潔にする",
  consistentStyle: "台本全体の文体を統一する",
  plainLanguage: "難しい表現を分かりやすい言葉にする",
} as const;

export const REWRITE_STRENGTH_LABELS = {
  light: "小さく整える",
  standard: "標準",
  active: "積極的に整える",
} as const;
