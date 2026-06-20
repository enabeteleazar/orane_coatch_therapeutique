import { Resend } from "resend";

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_BODY_SIZE = 20 * 1024;
const DEFAULT_FROM_EMAIL = "Equilibre Coaching <onboarding@resend.dev>";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const gmailFromRegex = /<[^>]+@(gmail|googlemail)\.com>$|^[^<>\s]+@(gmail|googlemail)\.com$/i;

function json(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseBody(req) {
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

      if (rawBody.length > MAX_BODY_SIZE) {
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

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { error: "La requête est invalide." };
  }

  const name = sanitize(payload.name);
  const email = sanitize(payload.email).toLowerCase();
  const phone = sanitize(payload.phone);
  const message = sanitize(payload.message);
  const website = sanitize(payload.website);

  if (website) {
    return { error: "Votre message n'a pas pu être envoyé." };
  }

  if (!name) {
    return { error: "Le nom est obligatoire." };
  }

  if (!email) {
    return { error: "L'adresse e-mail est obligatoire." };
  }

  if (!emailRegex.test(email)) {
    return { error: "L'adresse e-mail est invalide." };
  }

  if (!message) {
    return { error: "Le message est obligatoire." };
  }

  if (message.length < MIN_MESSAGE_LENGTH) {
    return {
      error: `Le message doit contenir au moins ${MIN_MESSAGE_LENGTH} caractères.`,
    };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      error: `Le message doit contenir moins de ${MAX_MESSAGE_LENGTH} caractères.`,
    };
  }

  return {
    value: {
      name,
      email,
      phone,
      message,
    },
  };
}

function getContactFromEmail() {
  const configuredFromEmail = sanitize(process.env.CONTACT_FROM_EMAIL);

  if (!configuredFromEmail) {
    return DEFAULT_FROM_EMAIL;
  }

  if (gmailFromRegex.test(configuredFromEmail)) {
    console.error(
      "[contact] CONTACT_FROM_EMAIL uses a Gmail address. Resend requires the from address to use onboarding@resend.dev or a verified domain. Falling back to default sender.",
    );
    return DEFAULT_FROM_EMAIL;
  }

  return configuredFromEmail;
}

function normalizeResendError(error) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    type: error.type,
  };
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

  if (!process.env.RESEND_API_KEY) {
    return json(res, 500, { error: "Le service d'envoi n'est pas configuré." });
  }

  if (!process.env.CONTACT_TO_EMAIL) {
    return json(res, 500, {
      error: "Le destinataire du formulaire n'est pas configuré.",
    });
  }

  const { name, email, phone, message } = validation.value;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = getContactFromEmail();

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: process.env.CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `Nouveau message de ${name}`,
      text: [
        `Nom: ${name}`,
        `Email: ${email}`,
        phone ? `Téléphone: ${phone}` : null,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <h2>Nouveau message depuis le site</h2>
        <p><strong>Nom:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${
          phone
            ? `<p><strong>Téléphone:</strong> ${escapeHtml(phone)}</p>`
            : ""
        }
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
      `,
    });

    if (error) {
      console.error("[contact] Resend send failed:", normalizeResendError(error));
      return json(res, 502, { error: "Le message n'a pas pu être envoyé." });
    }

    return json(res, 200, { success: true });
  } catch (error) {
    console.error("[contact] Resend send exception:", normalizeResendError(error));
    return json(res, 502, { error: "Le message n'a pas pu être envoyé." });
  }
}
