# Equilibre Coaching

## Configuration

Créer une variable d'environnement Vite pour l'envoi du formulaire de contact via Formspree :

```env
VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/xxxxxxx
```

Créer une variable d'environnement Vite pour le bouton WhatsApp de la rubrique Contact :

```env
VITE_WHATSAPP_PHONE=336XXXXXXXX
```

## Réservation Neon/Postgres + Google Calendar

Les créneaux proposés par le coach sont lus depuis Neon/Postgres dans la table
`booking_slots`. Google Calendar reste la source des réservations réelles :
chaque réservation crée un événement dans le calendrier `rdv-coach`, et un
créneau est affiché réservé lorsqu'un événement Google chevauche son horaire.

Créer un compte de service Google Cloud, partager le calendrier `rdv-coach`
avec l'e-mail de ce compte, puis configurer :

```env
DATABASE_URL=postgresql://...
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=...
GOOGLE_CALENDAR_NAME=rdv-coach
BOOKING_TIME_ZONE=Europe/Paris
ADMIN_PASSWORD=...
```

Optionnel : définir `GOOGLE_CALENDAR_ID` pour cibler directement un calendrier sans recherche par nom.

La page `/admin/creneaux` permet de créer, modifier, activer/désactiver et
supprimer les créneaux Postgres. Les routes admin attendent le mot de passe en
en-tête `x-admin-password`.
