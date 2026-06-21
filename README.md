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

## Réservation Google Calendar

Le popup de réservation lit et crée les rendez-vous dans un calendrier Google nommé `rdv-coach`.
Créer un compte de service Google Cloud, partager le calendrier `rdv-coach` avec l'e-mail de ce compte, puis configurer :

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_NAME=rdv-coach
BOOKING_TIME_ZONE=Europe/Paris
BOOKING_SLOT_MINUTES=90
BOOKING_DAY_START=09:00
BOOKING_DAY_END=18:00
BOOKING_WEEK_DAYS=1,2,3,4,5
```

Optionnel : définir `GOOGLE_CALENDAR_ID` pour cibler directement un calendrier sans recherche par nom.
