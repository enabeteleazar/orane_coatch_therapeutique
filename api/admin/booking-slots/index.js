import { requireAdmin } from "../../_adminAuth.js";
import { createBookingSlot, getBookingSlots } from "../../_bookingSlots.js";
import { json, parseBody } from "../../_googleCalendar.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req);

  if (!admin.ok) {
    return json(res, admin.statusCode, { error: admin.error });
  }

  try {
    if (req.method === "GET") {
      const slots = await getBookingSlots();
      return json(res, 200, { slots });
    }

    if (req.method === "POST") {
      const payload = await parseBody(req);
      const result = await createBookingSlot(payload);

      if (result.error) {
        return json(res, 400, { error: result.error });
      }

      return json(res, 201, { slot: result.value });
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Méthode non autorisée." });
  } catch (error) {
    console.error("[admin/booking-slots]", error);
    return json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Les créneaux n'ont pas pu être chargés.",
    });
  }
}
