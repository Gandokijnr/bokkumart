// Centralized error handling utility for safe user-facing messages
// Never expose internal details, API URLs, or stack traces to users

export type ErrorCategory =
  | "network"
  | "auth"
  | "validation"
  | "not_found"
  | "conflict"
  | "server"
  | "rate_limit"
  | "payment"
  | "unknown";

interface ErrorMapping {
  category: ErrorCategory;
  userMessage: string;
  logMessage?: string;
  statusCode?: number;
}

// Map HTTP status codes to safe user messages
const statusCodeMessages: Record<number, string> = {
  400: "Please check your information and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you're looking for.",
  409: "This information already exists. Please try again.",
  422: "Some information is invalid. Please check and try again.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong. Please try again later.",
  502: "Service temporarily unavailable. Please try again later.",
  503: "Service temporarily unavailable. Please try again later.",
};

// Map known error patterns to categories and messages
const errorPatterns: Array<{
  pattern: RegExp;
  mapping: ErrorMapping;
}> = [
  // Network errors
  {
    pattern: /fetch|network|timeout|abort|failed to fetch/i,
    mapping: {
      category: "network",
      userMessage: "Connection failed. Please check your internet and try again.",
    },
  },
  // Auth errors
  {
    pattern: /unauthorized|invalid.*token|session.*expired|not.*authenticated/i,
    mapping: {
      category: "auth",
      userMessage: "Your session has expired. Please sign in again.",
    },
  },
  {
    pattern: /forbidden|not.*allowed|permission/i,
    mapping: {
      category: "auth",
      userMessage: "You don't have permission to do that.",
    },
  },
  // Validation errors
  {
    pattern: /invalid|required|must.*be|cannot.*empty|validation/i,
    mapping: {
      category: "validation",
      userMessage: "Please check your information and try again.",
    },
  },
  // Not found
  {
    pattern: /not.*found|does not exist|could not find/i,
    mapping: {
      category: "not_found",
      userMessage: "We couldn't find what you're looking for.",
    },
  },
  // Conflict/Duplicate
  {
    pattern: /already.*exist|duplicate|conflict|taken/i,
    mapping: {
      category: "conflict",
      userMessage: "This information already exists. Please try different details.",
    },
  },
  // Rate limiting
  {
    pattern: /rate.*limit|too many|daily limit exceeded/i,
    mapping: {
      category: "rate_limit",
      userMessage: "Too many attempts. Please wait a moment and try again.",
    },
  },
  // Payment errors
  {
    pattern: /payment|insufficient funds|declined|card/i,
    mapping: {
      category: "payment",
      userMessage: "Payment could not be processed. Please try again or use a different method.",
    },
  },
  // Paystack specific (safe messages only)
  {
    pattern: /test mode.*limit exceeded/i,
    mapping: {
      category: "rate_limit",
      userMessage: "Please use Test Bank (001 or 011) for testing, or switch to live mode.",
      logMessage: "Paystack test mode daily limit exceeded",
    },
  },
  {
    pattern: /could not resolve|account not found|invalid account/i,
    mapping: {
      category: "validation",
      userMessage: "We couldn't verify that account. Please check the details and try again.",
    },
  },
];

/**
 * Get a safe, user-friendly error message
 * NEVER exposes API details, URLs, or internal error messages
 */
export function getSafeErrorMessage(error: unknown): string {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  // Extract error message string
  let errorMessage = "";
  let statusCode: number | undefined;

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "object" && error !== null) {
    const err = error as any;
    errorMessage =
      err.message || err.statusMessage || err.error || JSON.stringify(error);
    statusCode = err.statusCode || err.status;
  }

  errorMessage = String(errorMessage).toLowerCase();

  // First check status code for quick mapping
  if (statusCode && statusCodeMessages[statusCode]) {
    return statusCodeMessages[statusCode];
  }

  // Check patterns for more specific messages
  for (const { pattern, mapping } of errorPatterns) {
    if (pattern.test(errorMessage)) {
      return mapping.userMessage;
    }
  }

  // Default safe message
  return "Something went wrong. Please try again.";
}

/**
 * Get error category for analytics/handling
 */
export function getErrorCategory(error: unknown): ErrorCategory {
  if (!error) return "unknown";

  let errorMessage = "";
  let statusCode: number | undefined;

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "object" && error !== null) {
    const err = error as any;
    errorMessage = err.message || err.statusMessage || "";
    statusCode = err.statusCode || err.status;
  }

  errorMessage = String(errorMessage).toLowerCase();

  // Status code mapping
  if (statusCode) {
    if (statusCode === 401) return "auth";
    if (statusCode === 403) return "auth";
    if (statusCode === 404) return "not_found";
    if (statusCode === 409) return "conflict";
    if (statusCode === 422) return "validation";
    if (statusCode === 429) return "rate_limit";
    if (statusCode >= 500) return "server";
  }

  // Pattern matching
  for (const { pattern, mapping } of errorPatterns) {
    if (pattern.test(errorMessage)) {
      return mapping.category;
    }
  }

  return "unknown";
}

/**
 * Log error safely to console (for debugging only)
 * In production, send to error tracking service instead
 */
export function logError(error: unknown, context?: string): void {
  if (process.env.NODE_ENV === "production") {
    // In production, don't log to console
    // Send to error tracking service like Sentry
    return;
  }

  const category = getErrorCategory(error);
  const prefix = context ? `[${context}] ` : "";

  // Only log in development
  console.error(`${prefix}Error (${category}):`, error);
}

/**
 * Create a safe error response for API endpoints
 * Returns only safe, user-friendly information
 */
export function createSafeErrorResponse(
  error: unknown,
  internalLog?: string
): {
  success: false;
  message: string;
  category: ErrorCategory;
} {
  // Log internal details server-side only
  if (internalLog && process.env.NODE_ENV !== "production") {
    console.error("[Internal]", internalLog, error);
  }

  return {
    success: false,
    message: getSafeErrorMessage(error),
    category: getErrorCategory(error),
  };
}
