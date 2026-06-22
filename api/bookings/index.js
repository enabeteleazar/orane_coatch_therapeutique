import {
  buildAvailability,
  createBooking,
  findSlot,
  json,
  parseBody,
  sanitize,
} from "../_googleCalendar.js";

function validatePayload(payload) {
  const name = sanitize(payload?.name);
  const email = sanitize(payload?.email).toLowerCase();
  const phone = sanitize(payload?.phone);
  const message = sanitize(payload?.message);
  const start = sanitize(payload?.start);
  const end = sanitize(payload?.end);
  const website = sanitize(payload?.website);

  if (website) {
    return { error: "La réservation n'a pas pu être validée." };
  }

  if (name.length < 2) {
    return { error: "Veuillez indiquer votre nom complet." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Veuillez indiquer une adresse e-mail valide." };
  }

  if (phone.length < 6) {
    return { error: "Veuillez indiquer un numéro de téléphone valide." };
  }

  if (!start || !end) {
    return { error: "Veuillez sélectionner un créneau." };
  }

  return { value: { name, email, phone, message, start, end } };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Méthode non autorisée." });
  }

  let payload;

  try {
    payload = await parseBody(req);
  } catch (error) {
    return json(res, 400, { error: "La requête est invalide." });
  }

  const validation = validatePayload(payload);

  if (validation.error) {
    return json(res, 400, { error: validation.error });
  }

  const { name, email, phone, message, start, end } = validation.value;

  try {
    const weekStart = start.slice(0, 10);
    const availability = await buildAvailability(weekStart);
    const slot = findSlot(availability, start, end);

    if (!slot || slot.status !== "available") {
      return json(res, 409, {
        error: "Ce créneau n'est plus disponible. Choisissez un autre horaire.",
      });
    }

    await createBooking({ name, email, phone, message, start, end });

    return json(res, 200, { success: true });
  } catch (error) {
    console.error("[bookings]", error);
    return json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "La réservation n'a pas pu être validée.",
    });
  }
}
