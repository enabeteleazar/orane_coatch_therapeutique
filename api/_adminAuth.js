import crypto from "node:crypto";
import {
  getBlockRemainingSeconds,
  recordFailure,
  resetFailures,
} from "./_adminRateLimit.js";
import { getClientIp } from "./_clientIp.js";
import { isDatabaseConfigured } from "./_database.js";

function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getConfiguredPassword() {
  return sanitize(process.env.ADMIN_PASSWORD);
}

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getRequestPassword(req) {
  const explicitPassword = sanitize(getHeader(req, "x-admin-password"));

  if (explicitPassword) {
    return explicitPassword;
  }

  const authorization = sanitize(getHeader(req, "authorization"));

  if (authorization.startsWith("Bearer ")) {
    return sanitize(authorization.slice("Bearer ".length));
  }

  if (authorization.startsWith("Basic ")) {
    const decoded = Buffer.from(authorization.slice("Basic ".length), "base64")
      .toString("utf8")
      .split(":");
    return sanitize(decoded[1] ?? decoded[0]);
  }

  return "";
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function tooManyAttempts(remainingSeconds) {
  const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));

  return {
    ok: false,
    statusCode: 429,
    retryAfter: remainingSeconds,
    error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
  };
}

// La limitation des tentatives ne doit jamais bloquer l'admin légitime si la
// base est indisponible : en cas d'erreur, on journalise et on continue.
async function safely(label, action, fallback) {
  try {
    return await action();
  } catch (error) {
    console.error(`[admin-auth] ${label}:`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

export async function requireAdmin(req) {
  const configuredPassword = getConfiguredPassword();

  if (!configuredPassword) {
    return {
      ok: false,
      statusCode: 503,
      error: "ADMIN_PASSWORD n'est pas configuré.",
    };
  }

  const ip = getClientIp(req);
  const rateLimitEnabled = isDatabaseConfigured();

  if (rateLimitEnabled) {
    const remaining = await safely(
      "lecture du blocage",
      () => getBlockRemainingSeconds(ip),
      0,
    );

    if (remaining > 0) {
      return tooManyAttempts(remaining);
    }
  }

  if (!constantTimeEqual(getRequestPassword(req), configuredPassword)) {
    if (rateLimitEnabled) {
      const result = await safely("enregistrement de l'échec", () => recordFailure(ip), null);

      if (result?.blockedSeconds > 0) {
        console.warn("[admin-auth] IP bloquée après trop d'échecs:", ip);
        return tooManyAttempts(result.blockedSeconds);
      }
    }

    return {
      ok: false,
      statusCode: 401,
      error: "Accès admin non autorisé.",
    };
  }

  if (rateLimitEnabled) {
    await safely("réinitialisation des échecs", () => resetFailures(ip), null);
  }

  return { ok: true };
}

// Réponse d'erreur standard pour les routes admin.
export function sendAdminError(res, admin) {
  if (admin.retryAfter) {
    res.setHeader("Retry-After", String(admin.retryAfter));
  }

  res.status(admin.statusCode).json({ error: admin.error });
}
