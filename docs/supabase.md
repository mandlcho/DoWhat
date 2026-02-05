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
