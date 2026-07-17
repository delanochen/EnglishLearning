export const fallbackErrorTypes = ["RATE_LIMIT", "PROVIDER_5XX", "TIMEOUT", "UNKNOWN", "AI_EMPTY_RESPONSE", "AI_INVALID_JSON"] as const;
export const retrySameModelErrorTypes = ["PROVIDER_5XX", "TIMEOUT", "AI_EMPTY_RESPONSE", "AI_INVALID_JSON"] as const;

export function canFallback(errorType: string) {
  return (fallbackErrorTypes as readonly string[]).includes(errorType);
}

export function shouldRetrySameModel(errorType: string, retryCount: number) {
  return retryCount < 1 && (retrySameModelErrorTypes as readonly string[]).includes(errorType);
}

export function retryDelayMs(retryCount: number) {
  return Math.min(1000, 250 * 2 ** retryCount);
}
