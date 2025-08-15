This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Auth & Settings Integration

The app uses Supabase Auth (email magic link) plus tables: `profiles`, `user_settings`, `user_sessions` (see `supabase_schema_phase1.sql`).

### Environment Variables Required
Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
Make sure Email (magic link) auth is enabled in the Supabase dashboard. No service key is needed client-side for user operations.

### Common "Auth disabled" Causes
- Missing or wrong `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (check they match project settings).
- Email auth not enabled in Supabase Auth providers.
- Local dev started before adding env vars (restart `npm run dev`).
- Browser blocked the magic link email provider (spam folder).

### Sign In Flow
Users click the header "Sign In" button which navigates to `/sign-in` and requests a magic link.

### Privacy Toggle
`Track watch progress` in Settings > Privacy disables progress persistence immediately for new updates.

### Device Sessions
Each browser registers a logical session row; heartbeats every 5 minutes update `last_seen_at`.

