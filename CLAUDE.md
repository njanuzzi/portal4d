# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Production build → dist/
npm run lint       # ESLint
npm run typecheck  # TypeScript check (no emit)
npm run preview    # Preview production build locally
```

There are no tests. No test runner is configured.

## Architecture

Portal D4 is a private therapy management app with two user roles:

- **Therapist (`role = 'therapist'`)**: manages clients, diaries, and reports
- **Client (`role = 'client'`)**: fills out daily diary entries and views published reports

### Routing and auth flow (`src/App.tsx` + `src/contexts/AuthContext.tsx`)

`AppRoutes` guards routes by checking three states: `loading`, `user` (Supabase auth), and `profile` (fetched from the `profiles` table). Routes are rendered entirely differently depending on `profile.role`. There is a fourth unauthenticated flow: `/client/:token`, which bypasses Supabase auth entirely and is evaluated before the loading gate.

### Tokenless client access

Clients can be invited via a one-time link `/client/:token`. `ClientAccess.tsx` calls the `validate_client_token(uuid)` RPC (callable by `anon`, no auth required), and on success stores `{ token, client_id, expires_at }` in `localStorage` under the key `portal_client_access`. Client pages read this localStorage key to identify the current client without a Supabase session.

### Database schema (Supabase/PostgreSQL)

| Table | Purpose |
|---|---|
| `profiles` | One row per user; mirrors `auth.users` via `handle_new_user` trigger |
| `diaries` | Diary templates created by therapist; only one can be `is_active = true` at a time (DB trigger) |
| `diary_questions` | Questions belonging to a diary; column is `"order"` (SQL keyword, quoted) |
| `diary_entries` | One entry per client per day (`UNIQUE(user_id, date)`) |
| `entry_answers` | Answers to each question in an entry |
| `reports` | Clinical reports written by therapist; stored as HTML in `content_text` |
| `client_tokens` | Invite tokens for passwordless client access |

RLS is enabled on all tables. The therapist can read and write everything. Clients can only access their own data, and can only see reports where `published = true`.

**Column name mismatch**: The DB column is `"order"` but `database.types.ts` declares it as `order_num`. Queries must use `order_num` in the TypeScript type but the actual column name `order` in Supabase selects.

### Reports content format

Report body is stored as HTML in `content_text`. The `Reports.tsx` page uses `document.execCommand` for rich-text editing. The stored format is:

```html
<h2>Escaped Title</h2>
Sanitized HTML body...
```

Helper functions `escapeHtml`, `sanitizeHtml`, `stripHtml`, `composeReportContent`, `getReportTitle`, and `getReportExcerpt` handle this in `src/pages/therapist/Reports.tsx`.

### Partially migrated page

`src/pages/therapist/NewReport.tsx` still uses `MOCK_CLIENTS` and `MOCK_REPORTS` from `src/lib/mockData.ts` instead of Supabase. The canonical report creation flow is in `src/pages/therapist/Reports.tsx`.

### UI conventions

- Icons: `lucide-react` only — do not add other icon libraries
- Tailwind custom palette: `petrol` (primary/nav), `gold` (accent), `beige` (backgrounds), `dark` (#2C2C2C for text)
- Fonts: `font-sans` → Inter, `font-serif` → Playfair Display (headings)
- UI primitives are in `src/components/ui/` — use these components rather than raw HTML elements
- Locale is **pt-BR** throughout (dates, labels, messages)

### Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

### Creating the therapist account

Therapist accounts cannot self-register. Create via Supabase dashboard (Authentication → Users), then run:

```sql
UPDATE profiles
SET role = 'therapist', name = 'Nome da Terapeuta'
WHERE email = 'terapeuta@email.com';
```

### Deploying

Build outputs to `dist/`. Deploy to Vercel (auto-detects Vite) with the two env vars configured in the Vercel dashboard.
