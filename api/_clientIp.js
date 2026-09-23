function firstHeaderValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.split(",")[0].trim() : "";
}

// Adresse IP du visiteur. Sur Vercel, x-real-ip et x-forwarded-for sont
// renseignés par la plateforme et ne peuvent pas être falsifiés par le client.
export function getClientIp(req) {
  return (
    firstHeaderValue(req.headers?.["x-real-ip"]) ||
    firstHeaderValue(req.headers?.["x-forwarded-for"]) ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}
