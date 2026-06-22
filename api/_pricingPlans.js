import { queryDatabase } from "./_database.js";

const PRICING_PLAN_COLUMNS = `
  id,
  title,
  subtitle,
  description,
  price_cents,
  currency,
  duration_minutes,
  formula_type,
  features,
  is_active,
  display_order,
  created_at,
  updated_at
`;

let featuresColumnType = null;

function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value) {
  const normalized = sanitize(value);
  return normalized || null;
}

function toInteger(value, fieldName, { nullable = false, min = null } = {}) {
  if ((value === "" || value === null || value === undefined) && nullable) {
    return { value: null };
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    return { error: `${fieldName} doit être un nombre entier.` };
  }

  if (min !== null && numberValue < min) {
    return { error: `${fieldName} doit être supérieur ou égal à ${min}.` };
  }

  return { value: numberValue };
}

function normalizeFeatures(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(String(item))).filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).map((item) => sanitize(String(item))).filter(Boolean);
  }

  const rawValue = sanitize(value);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => sanitize(String(item))).filter(Boolean);
    }
  } catch {
    // Plain text is accepted below.
  }

  return rawValue
    .split(/\r?\n/)
    .map((item) => sanitize(item.replace(/^[-*]\s*/, "")))
    .filter(Boolean);
}

function mapPricingPlan(row) {
  return {
    id: Number(row.id),
    title: sanitize(row.title),
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    price_cents: Number(row.price_cents ?? 0),
    currency: sanitize(row.currency) || "EUR",
    duration_minutes:
      row.duration_minutes === null || row.duration_minutes === undefined
        ? null
        : Number(row.duration_minutes),
    formula_type: row.formula_type ?? "",
    features: normalizeFeatures(row.features),
    is_active: Boolean(row.is_active),
    display_order: Number(row.display_order ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getFeaturesColumnType() {
  if (featuresColumnType) {
    return featuresColumnType;
  }

  const { rows } = await queryDatabase(
    `
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'pricing_plans'
        AND column_name = 'features'
      LIMIT 1
    `,
  );

  const row = rows[0] ?? {};
  featuresColumnType = {
    dataType: sanitize(row.data_type).toLowerCase(),
    udtName: sanitize(row.udt_name).toLowerCase(),
  };

  return featuresColumnType;
}

function featuresSqlExpression(parameterIndex, columnType) {
  if (columnType.dataType === "json" || columnType.udtName === "json") {
    return `$${parameterIndex}::json`;
  }

  if (columnType.dataType === "jsonb" || columnType.udtName === "jsonb") {
    return `$${parameterIndex}::jsonb`;
  }

  if (columnType.dataType === "ARRAY" || columnType.dataType === "array") {
    return `$${parameterIndex}::text[]`;
  }

  return `$${parameterIndex}`;
}

function featuresSqlValue(features, columnType) {
  if (columnType.dataType === "json" || columnType.dataType === "jsonb") {
    return JSON.stringify(features);
  }

  if (columnType.udtName === "json" || columnType.udtName === "jsonb") {
    return JSON.stringify(features);
  }

  if (columnType.dataType === "ARRAY" || columnType.dataType === "array") {
    return features;
  }

  return features.join("\n");
}

function normalizePricingInput(payload, { partial = false } = {}) {
  const value = {};

  if (Object.hasOwn(payload ?? {}, "title") || !partial) {
    const title = sanitize(payload?.title);

    if (!title) {
      return { error: "Le titre du tarif est obligatoire." };
    }

    value.title = title;
  }

  for (const key of ["subtitle", "description", "formula_type", "currency"]) {
    if (Object.hasOwn(payload ?? {}, key) || !partial) {
      value[key] = key === "currency"
        ? (sanitize(payload?.[key]).toUpperCase() || "EUR")
        : toNullableString(payload?.[key]);
    }
  }

  if (Object.hasOwn(payload ?? {}, "price_cents") || Object.hasOwn(payload ?? {}, "price_euros") || !partial) {
    const priceValue = Object.hasOwn(payload ?? {}, "price_cents")
      ? payload?.price_cents
      : Math.round(Number(String(payload?.price_euros ?? "").replace(",", ".")) * 100);
    const price = toInteger(priceValue, "Le prix", { min: 0 });

    if (price.error) {
      return { error: price.error };
    }

    value.price_cents = price.value;
  }

  if (Object.hasOwn(payload ?? {}, "duration_minutes") || !partial) {
    const duration = toInteger(payload?.duration_minutes, "La durée", {
      nullable: true,
      min: 0,
    });

    if (duration.error) {
      return { error: duration.error };
    }

    value.duration_minutes = duration.value;
  }

  if (Object.hasOwn(payload ?? {}, "display_order") || !partial) {
    const displayOrder = toInteger(payload?.display_order ?? 0, "L'ordre d'affichage", {
      min: 0,
    });

    if (displayOrder.error) {
      return { error: displayOrder.error };
    }

    value.display_order = displayOrder.value;
  }

  if (Object.hasOwn(payload ?? {}, "is_active") || !partial) {
    if (payload?.is_active === true || payload?.is_active === false) {
      value.is_active = payload.is_active;
    } else {
      value.is_active = true;
    }
  }

  if (Object.hasOwn(payload ?? {}, "features") || !partial) {
    value.features = normalizeFeatures(payload?.features);
  }

  return { value };
}

export async function getPricingPlans() {
  const { rows } = await queryDatabase(`
    SELECT ${PRICING_PLAN_COLUMNS}
    FROM pricing_plans
    ORDER BY display_order ASC, id ASC
  `);
  return rows.map(mapPricingPlan);
}

export async function getActivePricingPlans() {
  const { rows } = await queryDatabase(`
    SELECT ${PRICING_PLAN_COLUMNS}
    FROM pricing_plans
    WHERE is_active = true
    ORDER BY display_order ASC, id ASC
  `);
  return rows.map(mapPricingPlan);
}

export async function createPricingPlan(payload) {
  const normalized = normalizePricingInput(payload);

  if (normalized.error) {
    return { error: normalized.error };
  }

  const columnType = await getFeaturesColumnType();
  const values = [
    normalized.value.title,
    normalized.value.subtitle,
    normalized.value.description,
    normalized.value.price_cents,
    normalized.value.currency,
    normalized.value.duration_minutes,
    normalized.value.formula_type,
    featuresSqlValue(normalized.value.features, columnType),
    normalized.value.is_active,
    normalized.value.display_order,
  ];

  const { rows } = await queryDatabase(
    `
      INSERT INTO pricing_plans (
        title,
        subtitle,
        description,
        price_cents,
        currency,
        duration_minutes,
        formula_type,
        features,
        is_active,
        display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, ${featuresSqlExpression(8, columnType)}, $9, $10)
      RETURNING ${PRICING_PLAN_COLUMNS}
    `,
    values,
  );

  return { value: mapPricingPlan(rows[0]) };
}

export async function updatePricingPlan(id, payload) {
  const planId = Number(id);

  if (!Number.isInteger(planId) || planId <= 0) {
    return { error: "L'identifiant du tarif est invalide." };
  }

  const normalized = normalizePricingInput(payload, { partial: true });

  if (normalized.error) {
    return { error: normalized.error };
  }

  const values = [];
  const fields = [];
  const columnType = Object.hasOwn(normalized.value, "features")
    ? await getFeaturesColumnType()
    : null;

  for (const key of [
    "title",
    "subtitle",
    "description",
    "price_cents",
    "currency",
    "duration_minutes",
    "formula_type",
    "is_active",
    "display_order",
  ]) {
    if (Object.hasOwn(normalized.value, key)) {
      values.push(normalized.value[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (Object.hasOwn(normalized.value, "features")) {
    values.push(featuresSqlValue(normalized.value.features, columnType));
    fields.push(`features = ${featuresSqlExpression(values.length, columnType)}`);
  }

  if (fields.length === 0) {
    return { error: "Aucune modification n'a été fournie." };
  }

  values.push(planId);
  const { rows } = await queryDatabase(
    `
      UPDATE pricing_plans
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING ${PRICING_PLAN_COLUMNS}
    `,
    values,
  );

  if (!rows[0]) {
    return { error: "Le tarif est introuvable.", statusCode: 404 };
  }

  return { value: mapPricingPlan(rows[0]) };
}

export async function deactivatePricingPlan(id) {
  return updatePricingPlan(id, { is_active: false });
}
