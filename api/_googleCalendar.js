import crypto from "node:crypto";
import { getActiveBookingSlots } from "./_bookingSlots.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

const DEFAULT_TIME_ZONE = "Europe/Paris";
const DEFAULT_CALENDAR_NAME = "rdv-coach";

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;
let cachedCalendarId = null;

export function json(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

export function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseBody(req, maxBodySize = 20 * 1024) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    return Promise.resolve(JSON.parse(req.body));
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;

      if (rawBody.length > maxBodySize) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getPrivateKey() {
  return sanitize(process.env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  if (cachedAccessToken && cachedAccessTokenExpiresAt - 60 > now) {
    return cachedAccessToken;
  }

  const clientEmail = sanitize(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const privateKey = getPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Google Calendar n'est pas configuré.");
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: CALENDAR_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsignedToken = `${header}.${claim}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsignedToken), privateKey)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${signature}`,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("[calendar] token request failed:", payload);
    throw new Error("L'accès Google Calendar a échoué.");
  }

  cachedAccessToken = payload.access_token;
  cachedAccessTokenExpiresAt = now + Number(payload.expires_in ?? 3600);

  return cachedAccessToken;
}

async function googleRequest(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("[calendar] google request failed:", {
      path,
      status: response.status,
      payload,
    });
    const googleMessage = sanitize(payload?.error?.message);

    if (response.status === 403 && googleMessage.includes("writer access")) {
      throw new Error(
        "Le compte de service Google doit avoir le droit de modifier le calendrier.",
      );
    }

    throw new Error("La requête Google Calendar a échoué.");
  }

  return payload;
}

export function getBookingConfig() {
  return {
    calendarName: sanitize(process.env.GOOGLE_CALENDAR_NAME) || DEFAULT_CALENDAR_NAME,
    timeZone: sanitize(process.env.BOOKING_TIME_ZONE) || DEFAULT_TIME_ZONE,
  };
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    sanitize(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
      getPrivateKey() &&
      (sanitize(process.env.GOOGLE_CALENDAR_ID) ||
        sanitize(process.env.GOOGLE_CALENDAR_NAME) ||
        DEFAULT_CALENDAR_NAME),
  );
}

export async function getCalendarId() {
  const configuredId = sanitize(process.env.GOOGLE_CALENDAR_ID);

  if (configuredId) {
    return configuredId;
  }

  if (cachedCalendarId) {
    return cachedCalendarId;
  }

  const { calendarName } = getBookingConfig();
  const payload = await googleRequest("/users/me/calendarList?minAccessRole=writer");
  const calendar = payload.items?.find((item) => item.summary === calendarName);

  if (!calendar?.id) {
    throw new Error(`Le calendrier Google "${calendarName}" est introuvable.`);
  }

  cachedCalendarId = calendar.id;
  return cachedCalendarId;
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function toDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateKey, days) {
  const parsed = parseDate(dateKey);
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return toDateKey(date);
}

function getLocalDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getWeekStart(value, timeZone) {
  const dateKey = value && parseDate(value) ? value : getLocalDateKey(new Date(), timeZone);
  const parsed = parseDate(dateKey);
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  return toDateKey(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + diffToMonday)));
}

function getWeekday(dateKey) {
  const parsed = parseDate(dateKey);
  const day = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function getLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedTimeToUtc(dateKey, time, timeZone) {
  const parsedDate = parseDate(dateKey);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(
    Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, hour, minute),
  );
  const localParts = getLocalParts(utcGuess, timeZone);
  const localAsUtc = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour,
    localParts.minute,
    localParts.second,
  );
  const offset = localAsUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offset);
}

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDayLabel(dateKey) {
  const parsed = parseDate(dateKey);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)));
}

function eventRange(event) {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;

  if (!start || !end) {
    return null;
  }

  return {
    start: new Date(start),
    end: new Date(end),
  };
}

function overlaps(slot, event) {
  return event.start < slot.end && event.end > slot.start;
}

async function fetchGoogleEventsForSlots({ calendarId, slots, timeZone }) {
  if (slots.length === 0) {
    return {
      events: [],
      eventRanges: [],
    };
  }

  const dates = slots.map((slot) => slot.date).sort();
  const timeMin = zonedTimeToUtc(dates[0], "00:00", timeZone).toISOString();
  const timeMax = zonedTimeToUtc(addDays(dates.at(-1), 1), "00:00", timeZone).toISOString();
  const eventsPayload = await googleRequest(
    `/calendars/${encodeURIComponent(calendarId)}/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
      }).toString(),
  );
  const events = (eventsPayload.items ?? []).filter((event) => event.status !== "cancelled");

  console.info("[calendar] événements Google Calendar lus:", events.length);

  return {
    events,
    eventRanges: events.map(eventRange).filter(Boolean),
  };
}

export async function getGoogleEventsCount() {
  const config = getBookingConfig();
  const slots = await getActiveBookingSlots();
  const calendarId = await getCalendarId();
  const { events } = await fetchGoogleEventsForSlots({
    calendarId,
    slots,
    timeZone: config.timeZone,
  });

  return events.length;
}

export async function buildAvailability() {
  const config = getBookingConfig();
  const slots = await getActiveBookingSlots();
  const calendarId = await getCalendarId();
  const { eventRanges } = await fetchGoogleEventsForSlots({
    calendarId,
    slots,
    timeZone: config.timeZone,
  });
  const days = [];
  const dayIndexes = new Map();

  for (const databaseSlot of slots) {
    const start = zonedTimeToUtc(databaseSlot.date, databaseSlot.startTime, config.timeZone);
    const end = zonedTimeToUtc(databaseSlot.date, databaseSlot.endTime, config.timeZone);
    const slot = { start, end };
    const reserved = eventRanges.some((event) => overlaps(slot, event));

    if (!dayIndexes.has(databaseSlot.date)) {
      dayIndexes.set(databaseSlot.date, days.length);
      days.push({
        date: databaseSlot.date,
        label: formatDayLabel(databaseSlot.date),
        weekdayIndex: getWeekday(databaseSlot.date),
        slots: [],
      });
    }

    days[dayIndexes.get(databaseSlot.date)].slots.push({
      id: databaseSlot.id,
      start: start.toISOString(),
      end: end.toISOString(),
      startLabel: formatTime(start, config.timeZone),
      endLabel: formatTime(end, config.timeZone),
      status: reserved ? "reserved" : "available",
    });
  }

  return {
    source: "database",
    calendarName: config.calendarName,
    timeZone: config.timeZone,
    weekStart: getWeekStart(days[0]?.date, config.timeZone),
    days,
  };
}

export function findSlot(availability, start, end) {
  return availability.days
    .flatMap((day) => day.slots)
    .find((slot) => slot.start === start && slot.end === end);
}

export async function createBooking({ name, email, phone, message, start, end }) {
  const config = getBookingConfig();
  const calendarId = await getCalendarId();
  const description = [
    `Nom: ${name}`,
    `Email: ${email}`,
    `Téléphone: ${phone}`,
    message ? `Message: ${message}` : null,
    "Origine: réservation site web Coach Thérapeutique",
  ]
    .filter(Boolean)
    .join("\n");

  return googleRequest(
    `/calendars/${encodeURIComponent(calendarId)}/events?` +
      new URLSearchParams({ sendUpdates: "all" }).toString(),
    {
      method: "POST",
      body: JSON.stringify({
        summary: `Rendez-vous coaching - ${name}`,
        description,
        attendees: [
          {
            email,
            displayName: name,
          },
        ],
        start: {
          dateTime: start,
          timeZone: config.timeZone,
        },
        end: {
          dateTime: end,
          timeZone: config.timeZone,
        },
        colorId: "6",
      }),
    },
  );
}
