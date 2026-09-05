const FIREBASE_ERRORS = {
  "auth/credential-already-in-use": "This email is already linked to another account. Try signing in instead.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/operation-not-allowed": "This sign-in method is not enabled. Contact support.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
  "auth/popup-blocked": "Pop-up was blocked. Allow pop-ups for this site and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/internal-error": "Something went wrong. Please try again.",
  "auth/admin-restricted-operation": "Anonymous sign-in is not enabled. Enable it in Firebase Console under Authentication > Sign-in method.",
};

export function getFirebaseErrorMessage(error) {
  if (!error) return "Something went wrong. Please try again.";
  const code = error.code || "";
  return FIREBASE_ERRORS[code] || error.message || "Something went wrong. Please try again.";
}

export function getStreamErrorMessage(error, fallback = "Unable to connect to chat.") {
  if (!error) return fallback;
  const message = (error.message || "").toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("econnrefused")
  ) {
    return "Cannot reach the chat server right now. Please try again.";
  }
  if (message.includes("503") || message.includes("not configured") || message.includes("temporarily unavailable")) {
    return "Chat is temporarily unavailable. Please try again in a moment.";
  }
  if (message.includes("401") || message.includes("session expired")) {
    return "Your session expired. Please refresh the page.";
  }
  if (message.includes("abort")) {
    return "The connection timed out. Check your network and try again.";
  }

  return error.message || fallback;
}

export async function fetchWithRetry(url, options, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (fetchError) {
      lastError = fetchError;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}
