const DEFAULT_HEALTH_URL = "/api/health";

export async function checkChatServerHealth(healthUrl = DEFAULT_HEALTH_URL) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, reason: "server_error", streamConfigured: false };
    }

    return {
      ok: Boolean(payload.ok),
      streamConfigured: Boolean(payload.streamConfigured),
      firebaseProject: payload.firebaseProject,
    };
  } catch (error) {
    const isTimeout = error.name === "AbortError";
    return {
      ok: false,
      reason: isTimeout ? "timeout" : "unreachable",
      streamConfigured: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getServerHealthMessage(health) {
  if (health.ok && !health.streamConfigured) {
    return "Chat is temporarily unavailable. Please try again in a moment.";
  }

  if (health.reason === "timeout") {
    return "The chat server is taking too long to respond. Please try again.";
  }

  if (health.reason === "unreachable") {
    return "Cannot reach the chat server right now. Make sure the app is running and try again.";
  }

  return "Something went wrong while connecting to chat. Please try again.";
}

export async function fetchChatConfig(configUrl = "/api/config") {
  const response = await fetch(configUrl);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.streamApiKey) {
    throw new Error(payload.error || "Chat is temporarily unavailable. Please try again.");
  }

  return payload;
}
