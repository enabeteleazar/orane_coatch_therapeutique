import { queryDatabase } from "./_database.js";

// Au bout de MAX_FAILURES mots de passe erronés en WINDOW_MINUTES minutes,
// l'adresse IP est bloquée pendant BLOCK_MINUTES minutes.
export const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;
const BLOCK_MINUTES = 15;

let tableReady = null;

// La table est créée automatiquement au premier usage : aucun script SQL
// n'est à lancer dans Neon.
function ensureTable() {
  if (!tableReady) {
    tableReady = queryDatabase(`
      CREATE TABLE IF NOT EXISTS admin_login_attempts (
        ip            TEXT PRIMARY KEY,
        failures      INTEGER     NOT NULL DEFAULT 0,
        window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
        blocked_until TIMESTAMPTZ
      )
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }

  return tableReady;
}

// Nombre de secondes de blocage restantes pour cette IP (0 si non bloquée).
export async function getBlockRemainingSeconds(ip) {
  await ensureTable();
  const { rows } = await queryDatabase(
    `
      SELECT CEIL(EXTRACT(EPOCH FROM blocked_until - now()))::int AS remaining
      FROM admin_login_attempts
      WHERE ip = $1 AND blocked_until > now()
    `,
    [ip],
  );

  return Number(rows[0]?.remaining ?? 0);
}

// Enregistre un échec et renvoie le nombre d'échecs de la fenêtre en cours
// ainsi que la durée de blocage éventuelle.
export async function recordFailure(ip) {
  await ensureTable();

  const expired = `admin_login_attempts.window_start < now() - interval '${WINDOW_MINUTES} minutes'`;
  const nextFailures = `CASE WHEN ${expired} THEN 1 ELSE admin_login_attempts.failures + 1 END`;

  const { rows } = await queryDatabase(
    `
      INSERT INTO admin_login_attempts (ip, failures, window_start, blocked_until)
      VALUES ($1, 1, now(), NULL)
      ON CONFLICT (ip) DO UPDATE SET
        failures = ${nextFailures},
        window_start = CASE WHEN ${expired} THEN now() ELSE admin_login_attempts.window_start END,
        blocked_until = CASE
          WHEN ${nextFailures} >= ${MAX_FAILURES}
            THEN now() + interval '${BLOCK_MINUTES} minutes'
          ELSE NULL
        END
      RETURNING
        failures,
        COALESCE(CEIL(EXTRACT(EPOCH FROM blocked_until - now()))::int, 0) AS remaining
    `,
    [ip],
  );

  return {
    failures: Number(rows[0]?.failures ?? 1),
    blockedSeconds: Number(rows[0]?.remaining ?? 0),
  };
}

export async function resetFailures(ip) {
  await ensureTable();
  await queryDatabase("DELETE FROM admin_login_attempts WHERE ip = $1", [ip]);
}
