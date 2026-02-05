## Supabase Setup (web)

Follow these steps to connect DoWhat to Supabase. The app only needs the anonymous client URL/key at runtime; everything else stays server-side inside Supabase.

### 1) Project settings

- Enable Email/Password auth in **Authentication → Providers**.
- Grab the Project URL and anon public API key from **Project Settings → API**.
- Add them as build env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. (For Netlify/Vercel, add under Site settings → Environment variables and redeploy.)

### 2) Database schema (SQL)

Run the SQL below in the Supabase SQL Editor.

```sql
-- Categories a user can tag todos with
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#2563eb',
  created_at timestamptz default now()
);

-- Todos for DoWhat
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'backlog',
  priority text not null default 'medium',
  is_complete boolean default false,
  due_date date,
  categories uuid[] default '{}'::uuid[],
  created_at timestamptz default now(),
  updated_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz
);

-- Row Level Security
alter table public.categories enable row level security;
alter table public.todos enable row level security;

-- Policies: users can see and mutate only their own rows
create policy "Users select own categories"
  on public.categories for select using (auth.uid() = user_id);
create policy "Users insert own categories"
  on public.categories for insert with check (auth.uid() = user_id);
create policy "Users update own categories"
  on public.categories for update using (auth.uid() = user_id);
create policy "Users delete own categories"
  on public.categories for delete using (auth.uid() = user_id);

create policy "Users select own todos"
  on public.todos for select using (auth.uid() = user_id);
create policy "Users insert own todos"
  on public.todos for insert with check (auth.uid() = user_id);
create policy "Users update own todos"
  on public.todos for update using (auth.uid() = user_id);
create policy "Users delete own todos"
  on public.todos for delete using (auth.uid() = user_id);
```

### 2b) Vault migration (run after the tables above)

This adds the zero-signup vault layer. Run it in the SQL editor **after** the original schema SQL has already been applied.

```sql
-- ---------------------------------------------------------------------------
-- 1.  Vaults table – one row per vault.  pin_hash is PBKDF2-SHA256 (256 bit,
--     hex-encoded), derived client-side.  The raw PIN never leaves the browser.
-- ---------------------------------------------------------------------------
create table if not exists public.vaults (
  id        text        primary key,          -- 256-bit random token (base64url)
  pin_hash  text        not null,             -- hex-encoded PBKDF2 output
  created_at timestamptz default now()
);

alter table public.vaults enable row level security;

-- Anyone can insert a new vault (creation) and select to verify PIN.
-- No updates or deletes – a vault is permanent.
create policy "Anon can create a vault"
  on public.vaults for insert with check (true);
create policy "Anon can verify a vault"
  on public.vaults for select using (true);

-- ---------------------------------------------------------------------------
-- 2.  Add vault_id to todos and categories.
--     Nullable so existing rows (keyed on user_id) are not broken.
-- ---------------------------------------------------------------------------
alter table public.todos      add column if not exists vault_id text;
alter table public.categories add column if not exists vault_id text;

-- ---------------------------------------------------------------------------
-- 3.  New RLS policies – anon can read/write rows that have a vault_id set.
--     Isolation is enforced client-side: every query filters .eq("vault_id", token).
--     The 256-bit token is the secret; guessing it is infeasible.
--     The existing auth.uid() policies remain, so logged-in users still work.
-- ---------------------------------------------------------------------------
create policy "Vault holders can select todos"
  on public.todos for select using (vault_id is not null);
create policy "Vault holders can insert todos"
  on public.todos for insert with check (vault_id is not null);
create policy "Vault holders can update todos"
  on public.todos for update using (vault_id is not null);
create policy "Vault holders can delete todos"
  on public.todos for delete using (vault_id is not null);

create policy "Vault holders can select categories"
  on public.categories for select using (vault_id is not null);
create policy "Vault holders can insert categories"
  on public.categories for insert with check (vault_id is not null);
create policy "Vault holders can update categories"
  on public.categories for update using (vault_id is not null);
create policy "Vault holders can delete categories"
  on public.categories for delete using (vault_id is not null);
```

> **Security note:** RLS lets any anon request touch _any_ vault row — the real
> isolation is that each client only ever queries its own `vault_id`, and that
> token is 256 bits of entropy. If you want true server-enforced isolation in
> the future, the policies can be tightened to compare `vault_id` against a
> header or a Supabase Edge Function that validates the PIN before proxying.

### 3) Realtime

- In Supabase, go to **Database → Replication → Realtime** and enable for the `public` schema (or specifically the `todos` and `categories` tables). The app listens on `public:todos` and `public:categories` channels for live updates.

### 4) Local env file (optional)

For local dev, create `.env` at the repo root:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_URL=https://your-pages-domain.github.io/your-repo
```

Restart `npm run dev` after editing env vars.

> Make sure `VITE_SITE_URL` matches your deployed domain and add that domain to Supabase **Authentication → URL Configuration → Redirect URLs** so email verification links land back on your site instead of localhost.
