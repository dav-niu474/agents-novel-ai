/**
 * Tolerant JSON extraction from an LLM response that may wrap the object in
 * prose or a ```json fence. Runtime-agnostic (used by the build engine; the
 * CLI's json-collect has its own inquirer-coupled loop on top of the same idea).
 */
export function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Extract a JSON object/array from a possibly-noisy LLM response, or null. */
export function extractJsonFromLLMResponse(text: string): unknown {
  const trimmed = text.trim();

  const direct = tryParseJson(trimmed);
  if (direct !== null) return direct;

  const fence = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fence) {
    const fenced = tryParseJson(fence[1] ?? '');
    if (fenced !== null) return fenced;
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const obj = tryParseJson(trimmed.slice(start, end + 1));
    if (obj !== null) return obj;
  }

  return null;
}
