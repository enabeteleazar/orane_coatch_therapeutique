import { requireAdmin } from "../../_adminAuth.js";
import { createPricingPlan, getPricingPlans } from "../../_pricingPlans.js";
import { json, parseBody } from "../../_googleCalendar.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);

  if (!admin.ok) {
    return json(res, admin.statusCode, { error: admin.error });
  }

  try {
    if (req.method === "GET") {
      const plans = await getPricingPlans();
      return json(res, 200, { plans });
    }

    if (req.method === "POST") {
      const payload = await parseBody(req, 64 * 1024);
      const result = await createPricingPlan(payload);

      if (result.error) {
        return json(res, 400, { error: result.error });
      }

      return json(res, 201, { plan: result.value });
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Méthode non autorisée." });
  } catch (error) {
    console.error("[admin/pricing-plans]", error);
    return json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Les tarifs n'ont pas pu être chargés.",
    });
  }
}
