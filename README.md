# VARK Learning Preferences — Netlify

Production migration package for Netlify.

## Architecture
- Static Arabic RTL frontend under `public/`
- Netlify Function API under `netlify/functions/api.mts`
- Netlify Database migration under `netlify/database/migrations/`

Netlify Database is provisioned automatically on a production deploy.
