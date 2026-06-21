import { buildAvailability, json } from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Méthode non autorisée." });
  }

  try {
    const availability = await buildAvailability(req.query?.weekStart);
    return json(res, 200, availability);
  } catch (error) {
    console.error("[bookings/availability]", error);
    return json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Les disponibilités n'ont pas pu être chargées.",
    });
  }
}
