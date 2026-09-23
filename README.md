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

### Protection du dashboard

Après 5 mots de passe erronés en 15 minutes, l'adresse IP est bloquée
15 minutes sur toutes les routes admin (réponse 429). Les tentatives sont
stockées dans la table `admin_login_attempts`, créée automatiquement au
premier usage.

La page `/dashboard` affiche le menu principal et garde la même URL pour la
gestion des créneaux et des formules de la table `pricing_plans`. Les routes
admin, dont la vérification d'accès au dashboard, attendent le mot de passe en
en-tête `x-admin-password`.
La section publique Tarifs lit les formules actives depuis `/api/pricing-plans`.

## Anti-robot Cloudflare Turnstile

La réservation est protégée par Cloudflare Turnstile. Créer un widget sur
https://dash.cloudflare.com (menu Turnstile, mode *Managed*) avec les
hostnames `localhost`, `127.0.0.1` et le(s) domaine(s) de production, puis :

```env
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...   # clé du site (publique)
TURNSTILE_SECRET_KEY=0x4AAAAAAA...      # clé secrète (serveur uniquement)
TURNSTILE_ALLOWED_HOSTNAMES=coach.example.fr,www.coach.example.fr  # optionnel
```

Le serveur (`api/_turnstile.js`) applique la vérification canonique
siteverify : `success === true`, `action === "booking"` et `hostname` dans
`TURNSTILE_ALLOWED_HOSTNAMES` (à défaut : le domaine qui reçoit la requête).
Les jetons sont à usage unique. Si Cloudflare est injoignable, la réservation
est refusée avec une erreur 503.

Sans `TURNSTILE_SECRET_KEY`, la vérification est désactivée côté serveur ;
sans `VITE_TURNSTILE_SITE_KEY`, le widget n'est pas affiché.
