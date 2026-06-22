import { requireAdmin } from "../../_adminAuth.js";
import { deactivatePricingPlan, updatePricingPlan } from "../../_pricingPlans.js";
import { json, parseBody } from "../../_googleCalendar.js";

function getPlanId(req) {
  const queryId = req.query?.id;

  if (Array.isArray(queryId)) {
    return queryId[0];
  }

  if (queryId) {
    return queryId;
  }

  const url = new URL(req.url, "http://localhost");
  return url.pathname.split("/").filter(Boolean).at(-1);
}

export default async function handler(req, res) {
  const admin = requireAdmin(req);

  if (!admin.ok) {
    return json(res, admin.statusCode, { error: admin.error });
  }

  try {
    const id = getPlanId(req);

    if (req.method === "PATCH" || req.method === "PUT") {
      const payload = await parseBody(req, 64 * 1024);
      const result = await updatePricingPlan(id, payload);

      if (result.error) {
        return json(res, result.statusCode ?? 400, { error: result.error });
      }

      return json(res, 200, { plan: result.value });
    }

    if (req.method === "DELETE") {
      const result = await deactivatePricingPlan(id);

      if (result.error) {
        return json(res, result.statusCode ?? 400, { error: result.error });
      }

      return json(res, 200, { plan: result.value });
    }

    res.setHeader("Allow", "PATCH, PUT, DELETE");
    return json(res, 405, { error: "Méthode non autorisée." });
  } catch (error) {
    console.error("[admin/pricing-plans/:id]", error);
    return json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Le tarif n'a pas pu être modifié.",
    });
  }
}
