export const SOFTWARE_KEYBOARD_THRESHOLD = 120;

export interface FocusVisibilityInput {
  elementTop: number;
  elementBottom: number;
  viewportTop: number;
  viewportHeight: number;
  topMargin?: number;
  bottomMargin?: number;
}

export function isSoftwareKeyboardOpen(
  layoutViewportHeight: number,
  visualViewportHeight: number,
): boolean {
  return layoutViewportHeight - visualViewportHeight > SOFTWARE_KEYBOARD_THRESHOLD;
}

export function getFocusScrollAdjustment({
  elementTop,
  elementBottom,
  viewportTop,
  viewportHeight,
  topMargin = 12,
  bottomMargin = 18,
}: FocusVisibilityInput): number {
  const safeTop = viewportTop + topMargin;
  const safeBottom = viewportTop + viewportHeight - bottomMargin;
  if (elementTop < safeTop) return elementTop - safeTop;
  if (elementBottom > safeBottom) return elementBottom - safeBottom;
  return 0;
}

export function ensureFocusedControlVisible(element: HTMLElement): void {
  if (!element.isConnected) return;
  const viewport = window.visualViewport;
  const rect = element.getBoundingClientRect();
  const adjustment = getFocusScrollAdjustment({
    elementTop: rect.top,
    elementBottom: rect.bottom,
    viewportTop: viewport?.offsetTop ?? 0,
    viewportHeight: viewport?.height ?? window.innerHeight,
  });
  if (Math.abs(adjustment) < 1) return;
  window.scrollBy({ top: adjustment, left: 0, behavior: "auto" });
}
