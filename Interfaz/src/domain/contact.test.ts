import { expect, test } from "vitest";
import { checkContact } from "./contact";

test.each([
  { input: "", ok: false },
  { input: "  ", ok: false },
  { input: "55 1234 5678", ok: true },
  { input: "+52 (55) 1234-5678", ok: true },
  { input: "12345", ok: false },
  { input: "taller@correo.mx", ok: true },
  { input: "taller@correo", ok: false },
  { input: "@correo.mx", ok: false },
  { input: "taller@correo.", ok: false },
])("checkContact($input).ok = $ok", ({ input, ok }) => {
  expect(checkContact(input).ok).toBe(ok);
});
