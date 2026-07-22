import type { ExportSettings, Segment } from "../types";
import { normalizeNewlines } from "./editor";

export function parseTimecode(value: string): number | null {
  const match = /^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(value.trim());
  if (!match) return null;
  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    Number(hours) * 3_600_000 +
    Number(minutes) * 60_000 +
    Number(seconds) * 1_000 +
    Number(milliseconds)
  );
}

export function formatTimecode(totalMilliseconds: number): string {
  const safe = Math.max(0, Math.round(totalMilliseconds));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const milliseconds = safe % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}

export function generateSrt(segments: Segment[], settings: ExportSettings): string {
  const start = parseTimecode(settings.startTimecode);
  if (start === null) throw new Error("開始時刻の形式が正しくありません。");
  const duration = Math.round(settings.durationSeconds * 1_000);
  const gap = Math.round(settings.gapSeconds * 1_000);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("表示時間は0より大きい値にしてください。");
  }
  if (!Number.isFinite(gap) || gap < 0) {
    throw new Error("字幕間の間隔は0以上にしてください。");
  }

  const nonEmpty = segments.filter((segment) => segment.text.trim().length > 0);
  return nonEmpty
    .map((segment, index) => {
      const cueStart = start + index * (duration + gap);
      const cueEnd = cueStart + duration;
      const text = normalizeNewlines(segment.text).replaceAll("\n", "\r\n");
      return `${index + 1}\r\n${formatTimecode(cueStart)} --> ${formatTimecode(cueEnd)}\r\n${text}`;
    })
    .join("\r\n\r\n")
    .concat(nonEmpty.length > 0 ? "\r\n" : "");
}

export function sanitizeFileBaseName(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100);
  return cleaned || "名称未設定の台本";
}

export function createSrtFile(title: string, srt: string): File {
  return new File(["\uFEFF", srt], `${sanitizeFileBaseName(title)}.srt`, {
    type: "application/x-subrip;charset=utf-8",
  });
}
