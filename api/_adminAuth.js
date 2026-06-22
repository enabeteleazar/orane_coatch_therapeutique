import crypto from "node:crypto";

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

export function requireAdmin(req) {
  const configuredPassword = getConfiguredPassword();

  if (!configuredPassword) {
    return {
      ok: false,
      statusCode: 503,
      error: "ADMIN_PASSWORD n'est pas configuré.",
    };
  }

  if (!constantTimeEqual(getRequestPassword(req), configuredPassword)) {
    return {
      ok: false,
      statusCode: 401,
      error: "Accès admin non autorisé.",
    };
  }

  return { ok: true };
}
