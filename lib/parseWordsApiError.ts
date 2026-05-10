/** Readable message from a failed /api/words JSON body (does not consume `res`). */
export async function parseWordsApiErrorResponse(res: Response): Promise<string> {
  try {
    const errBody = (await res.clone().json()) as { error?: string; details?: string };
    if (typeof errBody.details === "string" && errBody.details.trim()) return errBody.details.trim();
    if (typeof errBody.error === "string" && errBody.error.trim()) return errBody.error.trim();
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}
