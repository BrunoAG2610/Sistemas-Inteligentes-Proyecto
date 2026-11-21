const SINGULAR = 1;

/** "1 foto", "3 fotos". Único lugar con la regla de singular/plural de la interfaz. */
export function countNoun(count: number, one: string, many: string): string {
  return `${count} ${count === SINGULAR ? one : many}`;
}
