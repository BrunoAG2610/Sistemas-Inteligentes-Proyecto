import { expect, test } from "vitest";
import { checkImageFile, MAX_FILE_BYTES } from "./files";

test.each([
  { name: "a.jpg", type: "image/jpeg", size: 1, ok: true },
  { name: "a.png", type: "image/png", size: MAX_FILE_BYTES, ok: true },
  { name: "a.webp", type: "image/webp", size: MAX_FILE_BYTES + 1, ok: false },
  { name: "a.heic", type: "image/heic", size: 1, ok: false },
  { name: "a.pdf", type: "application/pdf", size: 1, ok: false },
  { name: "sin-tipo", type: "", size: 1, ok: false },
])("$name ($type, $size B) → ok=$ok", ({ ok, ...file }) => {
  expect(checkImageFile(file).ok).toBe(ok);
});
