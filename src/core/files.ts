export type DeliveryResult =
  | { status: "shared" }
  | { status: "downloaded" }
  | { status: "cancelled" }
  | { status: "failed"; message: string };

interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
}

export function canShareFile(navigatorLike: ShareNavigator, file: File): boolean {
  if (typeof navigatorLike.share !== "function") return false;
  if (typeof navigatorLike.canShare !== "function") return false;
  try {
    return navigatorLike.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareOrDownloadFile(
  file: File,
  shareTitle: string,
  navigatorLike: ShareNavigator = navigator,
  downloader: (fileToDownload: File) => void = downloadFile,
): Promise<DeliveryResult> {
  if (!canShareFile(navigatorLike, file)) {
    downloader(file);
    return { status: "downloaded" };
  }

  try {
    await navigatorLike.share?.({ title: shareTitle, files: [file] });
    return { status: "shared" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "cancelled" };
    }
    try {
      downloader(file);
      return { status: "downloaded" };
    } catch {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : "ファイルを共有できませんでした。",
      };
    }
  }
}
