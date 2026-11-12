


export function safe<T extends { ok: boolean; error?: string }>(
  name: string,
  fn: () => T,
): T | { ok: false; error: string } {
  try {
    return fn();
  } catch (e) {
    const error = (e as Error).message;
    console.error(`${name} error: ${error}`);
    return { ok: false, error };
  }
}