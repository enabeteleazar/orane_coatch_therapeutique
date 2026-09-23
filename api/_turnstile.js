const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isTurnstileConfigured() {
  return Boolean(sanitize(process.env.TURNSTILE_SECRET_KEY));
}

// Vérifie auprès de Cloudflare le jeton Turnstile envoyé par le navigateur.
// Tant que TURNSTILE_SECRET_KEY n'est pas définie, la vérification est
// désactivée pour ne pas bloquer les réservations pendant la mise en place.
export async function verifyTurnstileToken(token, remoteIp) {
  const secret = sanitize(process.env.TURNSTILE_SECRET_KEY);

  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY absente : vérification désactivée.");
    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false };
  }

  const body = new URLSearchParams({ secret, response: token });

  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(VERIFY_URL, { method: "POST", body });
  const payload = await response.json().catch(() => null);

  // Réponse illisible : c'est Cloudflare qui est injoignable, pas le jeton
  // qui est faux. L'appelant renvoie alors une erreur 503.
  if (!payload || typeof payload.success !== "boolean") {
    throw new Error(`Réponse Turnstile invalide (HTTP ${response.status}).`);
  }

  if (!payload.success) {
    console.warn("[turnstile] jeton refusé:", payload["error-codes"]);
  }

  return { success: Boolean(payload?.success) };
}
