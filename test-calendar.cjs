const { google } = require("googleapis");
const fs = require("fs");

const CALENDAR_ID =
  "70b64d55888d8b099a6587b4056291ae75a35600212728cb6cfe0d86f8bb396b@group.calendar.google.com";

async function main() {
  const key = JSON.parse(
    fs.readFileSync("/srv/git/web/coach/coach-site-key.json", "utf8")
  );

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  await auth.authorize();

  const calendar = google.calendar({ version: "v3", auth });

  const result = await calendar.events.list({
    calendarId: CALENDAR_ID,
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: new Date().toISOString(),
  });

  console.log("Connexion Google Calendar OK");
  console.log("Calendrier accessible :", CALENDAR_ID);
  console.log("Nombre d'événements trouvés :", result.data.items.length);

  for (const event of result.data.items) {
    console.log("-", event.summary || "(Sans titre)", event.start);
  }
}

main().catch((err) => {
  console.error("ERREUR :");
  console.error(err.response?.data || err);
});
