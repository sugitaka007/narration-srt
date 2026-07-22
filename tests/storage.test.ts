import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialState,
  duplicateProject,
  migrateStoredState,
  saveStoredState,
} from "../src/core/storage";
import { APP_CONFIG } from "../src/config";

test("旧形式に近い保存データを字幕を失わず現行バージョンへ移行する", () => {
  const migrated = migrateStoredState({
    projects: [
      {
        id: "project_legacy",
        title: "以前の台本",
        segments: [
          { id: "segment_legacy", text: "残したい文章" },
          { text: "IDなしの文章" },
        ],
      },
    ],
    activeProjectId: "project_legacy",
  });
  assert.equal(migrated.version, 1);
  assert.equal(migrated.projects[0].segments[0].text, "残したい文章");
  assert.equal(migrated.projects[0].segments[1].text, "IDなしの文章");
  assert.match(migrated.projects[0].segments[1].id, /^segment_/);
});

test("台本複製ではプロジェクトIDと全字幕IDを新しくする", () => {
  const source = migrateStoredState({
    projects: [{ id: "project_a", title: "元", segments: [{ id: "segment_a", text: "本文" }] }],
  }).projects[0];
  const copy = duplicateProject(source, new Date("2026-01-01T00:00:00.000Z"));
  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.segments[0].id, source.segments[0].id);
  assert.equal(copy.segments[0].text, source.segments[0].text);
});

test("端末保存へバージョン付きデータを書き込む", () => {
  let savedKey = "";
  let savedValue = "";
  saveStoredState(createInitialState(), {
    setItem(key, value) {
      savedKey = key;
      savedValue = value;
    },
  });
  assert.equal(savedKey, APP_CONFIG.storageKey);
  assert.equal(JSON.parse(savedValue).version, 1);
});
