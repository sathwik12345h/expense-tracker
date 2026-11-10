# Spendwise

A personal finance tracker: add what you spend by typing, talking or photographing a receipt, set a cap per category, and see the month as stacks of coins.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Three.js · Prisma + PostgreSQL · NextAuth

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and AUTH_SECRET
npm run db:push              # create the tables
npm run db:seed              # optional: a demo account with six months of data
npm run dev
```

The seed creates `test@spendwise.com` / `password123`; the sign-in page has a "demo account" link that uses it.

The AI features (Penny the assistant, voice commands, receipt reading, notes) need `GROQ_API_KEY`. Without it the app runs normally and those features show a fallback.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (includes the React Compiler rules) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Reset and refill the demo account |

## Where things live

| Path | Contents |
| --- | --- |
| `app/` | Routes. `/` landing, `/login`, `/signup`, `/dashboard` (Home), `/dashboard/activity`, `/dashboard/budget`, `/dashboard/insights`, `/dashboard/profile`, and the API under `app/api` |
| `app/globals.css` | The design system: colour tokens for day and night, the card, button and slider styles, keyframes |
| `components/ui` | Shared building blocks: `Button`, `Modal`, `Card`, `Switcher`, `Toasts`, the `ThemeCoin` switch, motion helpers |
| `components/three` | The WebGL coin engine (`StackScene`) and the in-app chart built on it (`CoinStacks`) |
| `components/shell` | The signed-in frame: side rail, tab bar, quick-add button, command palette, and `AppActions`, which owns every dialog |
| `components/site` | The landing page sections and the sign-in / sign-up frame |
| `components/home`, `activity`, `budgets`, `insights`, `profile` | One folder per screen |
| `components/entry`, `scan`, `voice`, `penny` | The add/edit dialog, receipt scanner, voice overlay and assistant |
| `lib/` | Data loading, calculations (`insights.ts`), request validation, theme and sound stores |

## Design notes

- **Colour** is four hues (evergreen, coral, sun, sky) on pale sage by day and deep pine by night. Every colour is a CSS variable switched by `data-theme` on `<html>`; charts and the WebGL scenes read the same variables.
- **The theme switch is a coin.** Flipping it changes the theme, and the new theme spreads out from the coin (View Transitions API, with an instant fallback).
- **3D is used where it carries information.** In the app, a stack's height is an amount and the ring around it is the cap. On the landing page, loose coins flying into stacks is the product's pitch.
- **Sound** is synthesised with Web Audio, very quiet, and limited to physical events (a coin landing, a key press, a save). One switch in Profile turns it off.
- **Motion** respects `prefers-reduced-motion` throughout; the 3D scenes render a still arrangement instead.

## API

All routes identify the user from the session and only touch that user's rows.

| Route | Methods |
| --- | --- |
| `/api/expenses` | `POST` create |
| `/api/expenses/[id]` | `PATCH` edit, `DELETE` |
| `/api/budgets` | `GET` month's caps with spend, `POST` set a cap (`limit: 0` removes it) |
| `/api/account` | `PATCH` name/email, `DELETE` account (needs password) |
| `/api/account/password` | `POST` change password |
| `/api/register` | `POST` create an account |
| `/api/ai/*` | Assistant, streaming chat, voice intent, receipt parsing, notes |
| `/api/graphql` | The same data over GraphQL, for the signed-in user |
| `/api/cron/budget-check` | Daily budget-alert emails (Vercel cron) |
