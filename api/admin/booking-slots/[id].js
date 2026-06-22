import { requireAdmin } from "../../_adminAuth.js";
import { deleteBookingSlot, updateBookingSlot } from "../../_bookingSlots.js";
import { json, parseBody } from "../../_googleCalendar.js";

function getSlotId(req) {
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
    const id = getSlotId(req);

    if (req.method === "PUT") {
      const payload = await parseBody(req);
      const result = await updateBookingSlot(id, payload);

      if (result.error) {
        return json(res, result.statusCode ?? 400, { error: result.error });
      }

      return json(res, 200, { slot: result.value });
    }

    if (req.method === "DELETE") {
      const result = await deleteBookingSlot(id);

      if (result.error) {
        return json(res, result.statusCode ?? 400, { error: result.error });
      }

      return json(res, 200, result.value);
    }

    res.setHeader("Allow", "PUT, DELETE");
    return json(res, 405, { error: "Méthode non autorisée." });
  } catch (error) {
    console.error("[admin/booking-slots/:id]", error);
    return json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Le créneau n'a pas pu être modifié.",
    });
  }
}
