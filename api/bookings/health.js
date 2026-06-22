import { checkDatabaseAccess, isDatabaseConfigured } from "../_database.js";
import { countActiveBookingSlots } from "../_bookingSlots.js";
import {
  getCalendarId,
  getGoogleEventsCount,
  isGoogleCalendarConfigured,
  json,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Méthode non autorisée." });
  }

  const databaseConfigured = isDatabaseConfigured();
  let databaseAccess = false;
  let databaseSlotsCount = 0;

  if (databaseConfigured) {
    try {
      await checkDatabaseAccess();
      databaseSlotsCount = await countActiveBookingSlots();
      databaseAccess = true;
    } catch (error) {
      console.error("[bookings/health] Postgres inaccessible:", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const googleCalendarConfigured = isGoogleCalendarConfigured();
  let googleCalendarAccess = false;
  let googleEventsCount = 0;

  if (googleCalendarConfigured) {
    try {
      if (databaseAccess) {
        googleEventsCount = await getGoogleEventsCount();
      } else {
        await getCalendarId();
      }
      googleCalendarAccess = true;
    } catch (error) {
      console.error("[bookings/health] Google Calendar inaccessible:", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return json(res, 200, {
    database_configured: databaseConfigured,
    database_access: databaseAccess,
    database_slots_count: databaseSlotsCount,
    google_calendar_configured: googleCalendarConfigured,
    google_calendar_access: googleCalendarAccess,
    google_events_count: googleEventsCount,
  });
}
