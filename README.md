# Todo React App

Simple browser-persistent todo list built with React and Vite. Todos are stored in `localStorage`, so they survive refreshes without needing a backend.

## Getting Started

1. Install dependencies (requires Node.js):
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open the URL printed by Vite (default: `http://localhost:5173`).

## Available Scripts

- `npm run dev` – start the Vite dev server.
- `npm run build` – build the app for production.
- `npm run preview` – preview the production build locally.
- `npm run lint` – run ESLint on the source files.
- `npm run test` – execute Vitest unit tests.

## Supabase backend

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your environment (or `.env`) to enable authentication and syncing against Supabase. See `docs/supabase.md` for the SQL schema, RLS policies, and realtime settings this app expects.

## Project Structure

```
├── docs/
│   ├── roadmap.md
│   └── supabase.md
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── hooks/
│   │   └── useTodos.js
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Next Steps

- Expand the UI with inline editing, due dates, and priorities.
- Add Vitest + React Testing Library tests covering the todo interactions.
- Optionally connect to a backend service for multi-device sync.
