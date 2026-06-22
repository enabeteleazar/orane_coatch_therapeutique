import { requireAdmin } from "../../_adminAuth.js";
import { json } from "../../_googleCalendar.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);

  if (!admin.ok) {
    return json(res, admin.statusCode, { error: admin.error });
  }

  if (req.method === "GET") {
    return json(res, 200, { ok: true });
  }

  res.setHeader("Allow", "GET");
  return json(res, 405, { error: "Méthode non autorisée." });
}
