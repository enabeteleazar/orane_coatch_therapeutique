import crypto from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

const DEFAULT_TIME_ZONE = "Europe/Paris";
const DEFAULT_CALENDAR_NAME = "rdv-coach";
const DEFAULT_SLOT_MINUTES = 90;
const DEFAULT_DAY_START = "09:00";
const DEFAULT_DAY_END = "18:00";
const DEFAULT_WEEK_DAYS = "1,2,3,4,5";

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
    throw new Error("La requête Google Calendar a échoué.");
  }

  return payload;
}

export function getBookingConfig() {
  return {
    calendarName: sanitize(process.env.GOOGLE_CALENDAR_NAME) || DEFAULT_CALENDAR_NAME,
    timeZone: sanitize(process.env.BOOKING_TIME_ZONE) || DEFAULT_TIME_ZONE,
    slotMinutes:
      Number.parseInt(process.env.BOOKING_SLOT_MINUTES ?? "", 10) ||
      DEFAULT_SLOT_MINUTES,
    dayStart: sanitize(process.env.BOOKING_DAY_START) || DEFAULT_DAY_START,
    dayEnd: sanitize(process.env.BOOKING_DAY_END) || DEFAULT_DAY_END,
    weekDays: (sanitize(process.env.BOOKING_WEEK_DAYS) || DEFAULT_WEEK_DAYS)
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
  };
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
  return date.toISOString().slice(0, 10);
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

function getCalendarDayNumber(dateKey) {
  const parsed = parseDate(dateKey);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
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

function minutesToTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
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
    weekday: "short",
    day: "2-digit",
    month: "short",
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

export async function buildAvailability(weekStartInput) {
  const config = getBookingConfig();
  const calendarId = await getCalendarId();
  const weekStart = getWeekStart(weekStartInput, config.timeZone);
  const weekEnd = addDays(weekStart, 7);
  const timeMin = zonedTimeToUtc(weekStart, "00:00", config.timeZone).toISOString();
  const timeMax = zonedTimeToUtc(weekEnd, "00:00", config.timeZone).toISOString();
  const eventsPayload = await googleRequest(
    `/calendars/${encodeURIComponent(calendarId)}/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
      }).toString(),
  );
  const eventRanges = (eventsPayload.items ?? [])
    .filter((event) => event.status !== "cancelled")
    .map(eventRange)
    .filter(Boolean);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const calendarDay = getCalendarDayNumber(date);
    const isBookableDay = config.weekDays.includes(calendarDay);
    const slots = [];

    if (isBookableDay) {
      const startMinutes = timeToMinutes(config.dayStart);
      const endMinutes = timeToMinutes(config.dayEnd);

      for (
        let minutes = startMinutes;
        minutes + config.slotMinutes <= endMinutes;
        minutes += config.slotMinutes
      ) {
        const start = zonedTimeToUtc(date, minutesToTime(minutes), config.timeZone);
        const end = zonedTimeToUtc(
          date,
          minutesToTime(minutes + config.slotMinutes),
          config.timeZone,
        );
        const slot = { start, end };
        const reserved = eventRanges.some((event) => overlaps(slot, event));

        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          startLabel: formatTime(start, config.timeZone),
          endLabel: formatTime(end, config.timeZone),
          status: reserved ? "reserved" : "available",
        });
      }
    }

    return {
      date,
      label: formatDayLabel(date),
      weekdayIndex: getWeekday(date),
      slots,
    };
  });

  return {
    calendarName: config.calendarName,
    timeZone: config.timeZone,
    slotMinutes: config.slotMinutes,
    weekStart,
    days,
  };
}

export function findSlot(availability, start, end) {
  return availability.days
    .flatMap((day) => day.slots)
    .find((slot) => slot.start === start && slot.end === end);
}

export async function createBooking({ name, phone, start, end }) {
  const config = getBookingConfig();
  const calendarId = await getCalendarId();

  return googleRequest(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: `Rendez-vous coaching - ${name}`,
      description: [`Nom: ${name}`, `Téléphone: ${phone}`].join("\n"),
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
  });
}
