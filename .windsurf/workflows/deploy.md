---
description: How to deploy the HomeAffairs Nuxt application
---

# Deployment Guide

## Prerequisites
- Node.js installed
- Supabase project configured
- Environment variables set up (copy from `.env.example`)

## Local Development
1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser.

## Production Build

### Build the application:
```bash
npm run build
```

### Preview production build locally:
```bash
npm run preview
```

## Environment Variables
Make sure these are set in your production environment:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/public key

## Deployment Options

### Static Hosting (Recommended for this app)
Generate static files for hosting on Netlify, Vercel, or any static host:
```bash
npx nuxt generate
```

The static files will be in `.output/public/` folder.

### Server-Side Rendering (SSR)
For platforms that support Node.js (Heroku, DigitalOcean, AWS, etc.):
```bash
npm run build
```

Start the server:
```bash
node .output/server/index.mjs
```

## Database Setup
Run Supabase migrations if needed:
```bash
supabase db push
```

## Post-Deployment Checklist
- [ ] Environment variables are configured
- [ ] Database is accessible
- [ ] Images load correctly
- [ ] Cart functionality works
- [ ] Checkout flow is working
