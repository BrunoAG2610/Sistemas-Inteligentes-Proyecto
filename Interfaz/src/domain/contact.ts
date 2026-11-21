const MIN_PHONE_DIGITS = 10;
const EMAIL_AT = "@";
const EMAIL_DOT = ".";

export type ContactCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

const isDigit = (char: string): boolean => char >= "0" && char <= "9";

function looksLikeEmail(value: string): boolean {
  const at = value.indexOf(EMAIL_AT);
  const domain = value.slice(at + EMAIL_AT.length);
  return at > 0 && domain.includes(EMAIL_DOT) && !domain.endsWith(EMAIL_DOT) && !value.includes(" ");
}

const looksLikePhone = (value: string): boolean => [...value].filter(isDigit).length >= MIN_PHONE_DIGITS;

/** Validación ligera: basta con que la llantera pueda responder. */
export function checkContact(raw: string): ContactCheck {
  const value = raw.trim();
  if (!value) return { ok: false, message: "Escribe un teléfono o correo para recibir las cotizaciones." };
  if (value.includes(EMAIL_AT)) {
    return looksLikeEmail(value) ? { ok: true } : { ok: false, message: "Revisa el correo: falta el dominio, como “@gmail.com”." };
  }
  return looksLikePhone(value)
    ? { ok: true }
    : { ok: false, message: `El teléfono debe tener al menos ${MIN_PHONE_DIGITS} dígitos.` };
}
