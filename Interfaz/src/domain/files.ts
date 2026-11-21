const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * BYTES_PER_MB;

/** Formatos que el texto de ayuda promete y que el modelo puede decodificar. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

const ACCEPTED: readonly string[] = ACCEPTED_IMAGE_TYPES;

export type FileCheck = { readonly ok: true } | { readonly ok: false; readonly message: string };

interface FileLike {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export function checkImageFile(file: FileLike): FileCheck {
  if (!ACCEPTED.includes(file.type)) {
    return { ok: false, message: `“${file.name}” no es una foto JPG, PNG o WebP.` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `“${file.name}” pesa más de ${MAX_FILE_MB} MB. Baja la resolución o recórtala.`,
    };
  }
  return { ok: true };
}
