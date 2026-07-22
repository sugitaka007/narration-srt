import assert from "node:assert/strict";
import test from "node:test";
import { createRewriteExchange, parseAndValidateRewriteJson, validateRewriteExchange } from "../src/core/rewrite";
import { DEFAULT_EXPORT_SETTINGS, DEFAULT_REWRITE_PREFERENCES } from "../src/core/storage";
import type { GptRewriteExchange, Project } from "../src/types";

function makeProject(): Project {
  return {
    id: "project_test",
    title: "動画タイトル",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    segments: [
      { id: "segment_a", text: "これはテストです" },
      { id: "segment_b", text: "二つ目の字幕です" },
    ],
    rewritePreferences: { ...DEFAULT_REWRITE_PREFERENCES },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  };
}

function completedExchange(project: Project) {
  const created = createRewriteExchange(
    project,
    {
      ...DEFAULT_REWRITE_PREFERENCES,
      desiredTone: "落ち着いた口調",
      customInstruction: "語尾を丁寧に",
    },
    new Date("2026-02-03T04:05:06.000Z"),
    "request_test",
  );
  project.lastRewriteRequest = created.record;
  const exchange = structuredClone(created.exchange) as GptRewriteExchange;
  exchange.status = "completed";
  exchange.segments[0].revisedText = "これはテスト用です";
  exchange.segments[1].revisedText = exchange.segments[1].sourceText;
  return exchange;
}

test("GPT修正用JSONへ選択指示・固有ID・順番・修正前文章・必須条件を保存する", () => {
  const project = makeProject();
  const { exchange } = createRewriteExchange(
    project,
    { ...DEFAULT_REWRITE_PREFERENCES, targetAudience: "動画編集の初心者" },
    new Date("2026-02-03T04:05:06.000Z"),
    "request_test",
  );
  assert.equal(exchange.format, "narration-rewrite-exchange");
  assert.equal(exchange.schemaVersion, 1);
  assert.equal(exchange.requestId, "request_test");
  assert.deepEqual(exchange.segments.map(({ id, order, sourceText }) => ({ id, order, sourceText })), [
    { id: "segment_a", order: 1, sourceText: "これはテストです" },
    { id: "segment_b", order: 2, sourceText: "二つ目の字幕です" },
  ]);
  assert.match(exchange.rewriteRequest.instructionForGPT, /字幕の個数を変えない/);
  assert.match(exchange.rewriteRequest.instructionForGPT, /変更してよいのはsegments内のrevisedText/);
  assert.match(exchange.rewriteRequest.instructionForGPT, /動画編集の初心者/);
  assert.equal(exchange.status, "request");
});

test("正常なGPT修正済みJSONを検証し、変更と競合を識別する", () => {
  const project = makeProject();
  const exchange = completedExchange(project);
  project.segments[0] = { ...project.segments[0], text: "アプリ側で編集した文章" };
  const result = validateRewriteExchange(exchange, project);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.review.items[0].changed, true);
  assert.equal(result.review.items[0].conflict, true);
  assert.equal(result.review.items[1].changed, false);
});

test("字幕数・ID・順番・sourceTextを変更したJSONは現在の台本を変更せず拒否できる", () => {
  const mutations: Array<(exchange: GptRewriteExchange) => void> = [
    (exchange) => { exchange.segments.pop(); },
    (exchange) => { exchange.segments[0].id = "segment_changed"; },
    (exchange) => { exchange.segments[0].order = 2; },
    (exchange) => { exchange.segments[0].sourceText = "改ざん"; },
  ];
  for (const mutate of mutations) {
    const project = makeProject();
    const exchange = completedExchange(project);
    mutate(exchange);
    const before = structuredClone(project.segments);
    const result = validateRewriteExchange(exchange, project);
    assert.equal(result.ok, false);
    assert.deepEqual(project.segments, before);
  }
});

test("壊れたJSONと字幕構成が変わった台本を安全に拒否する", () => {
  const project = makeProject();
  assert.equal(parseAndValidateRewriteJson("{broken", project).ok, false);

  const exchange = completedExchange(project);
  project.segments.push({ id: "segment_new", text: "後から追加" });
  const result = validateRewriteExchange(exchange, project);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.includes("追加・削除・並べ替え")));
  }
});

test("GPTが返したMarkdownコードブロックからも補助読み込みできる", () => {
  const project = makeProject();
  const exchange = completedExchange(project);
  const result = parseAndValidateRewriteJson(
    `\`\`\`json\n${JSON.stringify(exchange)}\n\`\`\``,
    project,
  );
  assert.equal(result.ok, true);
});
