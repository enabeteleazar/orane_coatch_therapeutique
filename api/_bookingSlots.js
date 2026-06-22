import { queryDatabase } from "./_database.js";

const BOOKING_SLOT_COLUMNS = `
  id,
  slot_date::text AS slot_date,
  start_time::text AS start_time,
  end_time::text AS end_time,
  enabled
`;

const ACTIVE_SLOTS_QUERY = `
  SELECT ${BOOKING_SLOT_COLUMNS}
  FROM booking_slots
  WHERE enabled = true
  ORDER BY slot_date ASC, start_time ASC
`;

function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toDateKey(value) {
  if (value instanceof Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${values.year}-${values.month}-${values.day}`;
  }

  const stringValue = sanitize(String(value ?? ""));
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(stringValue);
  return match ? match[1] : "";
}

function toTimeKey(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }

  const stringValue = sanitize(String(value ?? ""));
  const match = /^(\d{2}:\d{2})/.exec(stringValue);
  return match ? match[1] : "";
}

function timeToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function mapSlot(row) {
  return {
    id: Number(row.id),
    date: toDateKey(row.slot_date),
    startTime: toTimeKey(row.start_time),
    endTime: toTimeKey(row.end_time),
    enabled: Boolean(row.enabled),
  };
}

function normalizeSlotInput(payload, { partial = false } = {}) {
  const date = toDateKey(payload?.date ?? payload?.slot_date);
  const startTime = toTimeKey(payload?.startTime ?? payload?.start_time);
  const endTime = toTimeKey(payload?.endTime ?? payload?.end_time);
  const enabled =
    typeof payload?.enabled === "boolean" ? payload.enabled : payload?.enabled;

  const value = {};

  if (date || !partial) {
    if (!isValidDate(date)) {
      return { error: "La date du créneau est invalide." };
    }
    value.date = date;
  }

  if (startTime || !partial) {
    if (!isValidTime(startTime)) {
      return { error: "L'heure de début est invalide." };
    }
    value.startTime = startTime;
  }

  if (endTime || !partial) {
    if (!isValidTime(endTime)) {
      return { error: "L'heure de fin est invalide." };
    }
    value.endTime = endTime;
  }

  const finalStartTime = value.startTime ?? toTimeKey(payload?.currentStartTime);
  const finalEndTime = value.endTime ?? toTimeKey(payload?.currentEndTime);

  if (
    finalStartTime &&
    finalEndTime &&
    timeToMinutes(finalStartTime) >= timeToMinutes(finalEndTime)
  ) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  if (enabled !== undefined) {
    if (enabled === true || enabled === false) {
      value.enabled = enabled;
    } else {
      return { error: "Le statut du créneau est invalide." };
    }
  }

  return { value };
}

export async function getActiveBookingSlots() {
  const { rows } = await queryDatabase(ACTIVE_SLOTS_QUERY);
  return rows.map(mapSlot);
}

export async function countActiveBookingSlots() {
  const { rows } = await queryDatabase(
    "SELECT COUNT(*)::int AS count FROM booking_slots WHERE enabled = true",
  );
  return Number(rows[0]?.count ?? 0);
}

export async function getBookingSlots() {
  const { rows } = await queryDatabase(`
    SELECT ${BOOKING_SLOT_COLUMNS}
    FROM booking_slots
    ORDER BY slot_date ASC, start_time ASC
  `);
  return rows.map(mapSlot);
}

export async function createBookingSlot(payload) {
  const normalized = normalizeSlotInput(payload);

  if (normalized.error) {
    return { error: normalized.error };
  }

  const { date, startTime, endTime, enabled = true } = normalized.value;
  const { rows } = await queryDatabase(
    `
      INSERT INTO booking_slots (slot_date, start_time, end_time, enabled)
      VALUES ($1::date, $2::time, $3::time, $4::boolean)
      RETURNING ${BOOKING_SLOT_COLUMNS}
    `,
    [date, startTime, endTime, enabled],
  );

  return { value: mapSlot(rows[0]) };
}

export async function updateBookingSlot(id, payload) {
  const slotId = Number(id);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return { error: "L'identifiant du créneau est invalide." };
  }

  const normalized = normalizeSlotInput(payload, { partial: true });

  if (normalized.error) {
    return { error: normalized.error };
  }

  const fields = [];
  const values = [];

  for (const [column, key] of [
    ["slot_date", "date"],
    ["start_time", "startTime"],
    ["end_time", "endTime"],
    ["enabled", "enabled"],
  ]) {
    if (Object.hasOwn(normalized.value, key)) {
      values.push(normalized.value[key]);
      fields.push(`${column} = $${values.length}`);
    }
  }

  if (fields.length === 0) {
    return { error: "Aucune modification n'a été fournie." };
  }

  values.push(slotId);
  const { rows } = await queryDatabase(
    `
      UPDATE booking_slots
      SET ${fields.join(", ")}
      WHERE id = $${values.length}
      RETURNING ${BOOKING_SLOT_COLUMNS}
    `,
    values,
  );

  if (!rows[0]) {
    return { error: "Le créneau est introuvable.", statusCode: 404 };
  }

  return { value: mapSlot(rows[0]) };
}

export async function deleteBookingSlot(id) {
  const slotId = Number(id);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return { error: "L'identifiant du créneau est invalide." };
  }

  const { rowCount } = await queryDatabase("DELETE FROM booking_slots WHERE id = $1", [
    slotId,
  ]);

  if (rowCount === 0) {
    return { error: "Le créneau est introuvable.", statusCode: 404 };
  }

  return { value: { success: true } };
}
