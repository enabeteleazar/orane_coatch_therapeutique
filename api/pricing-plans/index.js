import { getActivePricingPlans } from "../_pricingPlans.js";
import { json } from "../_googleCalendar.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const plans = await getActivePricingPlans();
      return json(res, 200, { plans });
    }

    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Méthode non autorisée." });
  } catch (error) {
    console.error("[pricing-plans]", error);
    return json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Les tarifs n'ont pas pu être chargés.",
    });
  }
}
