import toastLib, { ToastOptions } from "react-hot-toast";

// ---------------------------------------------------------------------------
// Unique-ID generator (tiny, no crypto dependency)
// ---------------------------------------------------------------------------

/**
 * Returns a short, stable string key for a given `type + message` pair so
 * that rapidly repeated toasts collapse into a single notification.
 */
function toastId(type: string, message: string): string {
  // Simple djb2-style hash — fast, collision-resistant enough for UI toasts
  let hash = 5381;
  const str = `${type}:${message}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // unsigned 32-bit + hex prefix keeps it readable in DevTools
  return `toast-${(hash >>> 0).toString(16)}`;
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacement for `react-hot-toast`
// ---------------------------------------------------------------------------

export interface AppToastOptions extends ToastOptions {
  /**
   * Override the auto-generated dedup ID.  Pass a unique value if you want
   * two different toasts with the same message to show simultaneously.
   */
  id?: string;
}

const toast = {
  success(message: string, options?: AppToastOptions) {
    return toastLib.success(message, {
      id: toastId("success", message),
      ...options,
    });
  },

  error(message: string, options?: AppToastOptions) {
    return toastLib.error(message, {
      id: toastId("error", message),
      ...options,
    });
  },

  loading(message: string, options?: AppToastOptions) {
    return toastLib.loading(message, {
      id: toastId("loading", message),
      ...options,
    });
  },

  info(message: string, options?: AppToastOptions) {
    // react-hot-toast doesn't have a dedicated "info" variant — use generic
    return toastLib(message, {
      id: toastId("info", message),
      ...options,
    });
  },

  /** Dismiss the toast associated with a given message + type pair. */
  dismissByMessage(type: string, message: string) {
    toastLib.dismiss(toastId(type, message));
  },

  /** Pass-through for direct dismiss by ID. */
  dismiss: toastLib.dismiss,

  /** Pass-through for promise toasts (these already handle their own IDs). */
  promise: toastLib.promise,
} as const;

export default toast;
