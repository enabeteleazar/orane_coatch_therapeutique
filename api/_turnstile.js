const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 10_000;
const MAX_TOKEN_LENGTH = 2048;

// Action déclarée par le widget de la fenêtre de réservation.
export const BOOKING_ACTION = "booking";

function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstHeaderValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.split(",")[0].trim() : "";
}

export function isTurnstileConfigured() {
  return Boolean(sanitize(process.env.TURNSTILE_SECRET_KEY));
}

// Hostnames sur lesquels le widget a le droit d'avoir été résolu.
// TURNSTILE_ALLOWED_HOSTNAMES (liste séparée par des virgules) est prioritaire ;
// à défaut, on accepte le domaine qui a reçu la requête.
export function getExpectedHostnames(req) {
  const configured = sanitize(process.env.TURNSTILE_ALLOWED_HOSTNAMES)
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length > 0) {
    return new Set(configured);
  }

  const requestHost = (
    firstHeaderValue(req?.headers?.["x-forwarded-host"]) ||
    firstHeaderValue(req?.headers?.host)
  )
    .replace(/:\d+$/, "")
    .toLowerCase();

  return new Set(requestHost ? [requestHost] : []);
}

// Vérification canonique Turnstile (siteverify) :
// - success === true ;
// - action === action attendue ;
// - hostname dans la liste autorisée.
// Les jetons sont à usage unique : Cloudflare refuse un jeton rejoué
// (error-code "timeout-or-duplicate").
//
// Tant que TURNSTILE_SECRET_KEY n'est pas définie, la vérification est
// désactivée pour ne pas bloquer les réservations pendant la mise en place.
export async function verifyTurnstileToken(
  token,
  { remoteIp, expectedAction, expectedHostnames },
) {
  const secret = sanitize(process.env.TURNSTILE_SECRET_KEY);

  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY absente : vérification désactivée.");
    return { success: true, skipped: true };
  }

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return { success: false, reason: "missing-or-invalid-token" };
  }

  const body = new URLSearchParams({ secret, response: token });

  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);

  // Réponse illisible : c'est Cloudflare qui est injoignable, pas le jeton
  // qui est faux. L'appelant renvoie alors une erreur 503.
  if (!payload || typeof payload.success !== "boolean") {
    throw new Error(`Réponse Turnstile invalide (HTTP ${response.status}).`);
  }

  if (!payload.success) {
    console.warn("[turnstile] jeton refusé:", payload["error-codes"]);
    return { success: false, reason: "rejected" };
  }

  if (expectedAction && payload.action !== expectedAction) {
    console.warn("[turnstile] action inattendue:", payload.action);
    return { success: false, reason: "action-mismatch" };
  }

  if (expectedHostnames && !expectedHostnames.has(String(payload.hostname).toLowerCase())) {
    console.warn("[turnstile] hostname non autorisé:", payload.hostname);
    return { success: false, reason: "hostname-mismatch" };
  }

  return { success: true };
}
