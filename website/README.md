# Krabikani website

Next.js landing page for Krabikani, optimized for searches related to independent third-party Android companions for WaniKani users.

## Local development

```sh
cd website
npm install
npm run dev
```

## Production build

```sh
cd website
npm run build
npm start
```

## Vercel

The root `vercel.json` points Vercel at this folder:

- install: `npm install --prefix website`
- build: `npm run build --prefix website`
- output: `website/.next`

Set `NEXT_PUBLIC_SITE_URL` in Vercel if the final production domain differs from `https://unai-dogfood-krabikani.vercel.app`.
