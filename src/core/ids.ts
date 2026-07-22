export function createId(prefix: "project" | "segment" | "request"): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomPart}`;
}
