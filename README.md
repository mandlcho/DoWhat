# DoWhat ✅

> A modern, real-time todo tracker built for people who want to organize their work across multiple statuses—without the bloat.

## The Story: How This Started

### The Problem

Managing tasks across projects is chaotic. Most todo apps either:

- Force you into a flat list that doesn't scale
- Require constant switching between "backlog" and "active" views
- Don't sync across devices or feel sluggish
- Bury important features behind paywalls

I wanted a tool that:

- Shows **all my tasks at once** in a visual board (Kanban-style)
- Lets me **switch views instantly** (list or card view)
- **Syncs in real-time** across all my devices
- Supports **multiple prioritization methods** (priority levels, due dates, categories)
- **Feels fast and responsive** (no waiting)

### Building It

Instead of settling for existing solutions, I built DoWhat as part of an ongoing mission: tackling a real-world problem every weekend. This weekend project is lightweight, open-source, and built with modern web tech that actually works. Each project teaches me something new while solving something I actually need.

---

## What DoWhat Does

A real-time task management app that:

- 📋 Organize todos across **Backlog → Active → Done** columns
- 🎯 Set priorities (high, medium, low) and due dates with visual calendar
- 🏷️ Tag todos with custom categories for better filtering
- 🔗 **Sync across devices** with no account required (see [how it works](#cross-device-sync-no-account-needed) below)
- 🔄 **Drag-and-drop** reordering in both list and card views
- 🎨 Light/dark theme toggle
- 📱 Responsive design (works on mobile, tablet, desktop)
- 🗂️ Archive completed tasks or restore them later

**Live Demo**: [DoWhat on GitHub Pages](https://mandlcho.github.io/DoWhat/)

---

## Cross-device sync, no account needed

Most apps make you sign up before your tasks can live on more than one device.
DoWhat skips that entirely. Here is how it works in practice:

**First device (phone, laptop, whatever you have open first):**

1. Open DoWhat. You land on a single screen — no email, no password.
2. Pick a PIN (at least 4 characters). That is the only credential you will ever need.
3. DoWhat generates a unique **vault code** — a long random string that identifies your task list. It is displayed on screen with a copy button.

**Second device (the other one):**

1. Open DoWhat on your phone (or any other browser).
2. Tap **join vault**.
3. Paste the vault code you copied earlier, enter the same PIN.
4. Done. Your tasks appear instantly, and stay in sync on both devices.

**What is actually happening under the hood** (the short version):

- The vault code is a 256-bit random token — long enough that no one can guess it.
- The PIN is never sent to the server in plain text. Your browser turns it into a one-way hash before it leaves your device, so even the database only ever sees the hash.
- Every time you add or update a task, it is tagged with your vault code. Only devices that know your code ever see your tasks.
- Real-time subscriptions (via Supabase) push changes to all connected devices the moment they happen — no polling, no refresh.

The net result: tasks sync across as many devices as you like, the PIN keeps strangers out, and you never had to create an account.

---

## Quick Start

### Prerequisites

- Node.js (v16+)
- npm or yarn
- A Supabase account (free tier works great)

### Installation

```bash
git clone https://github.com/mandlcho/DoWhat.git
cd DoWhat
npm install
```

### Development

```bash
npm run dev
```

Opens http://localhost:5173 with hot reload.

### Build & Deploy

```bash
npm run build        # Create production bundle in dist/
npm run preview      # Test the production build locally
```

---

## Setup

### Local Development

1. Create a `.env` file in the repo root:

   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SITE_URL=http://localhost:5173
   ```

2. Restart `npm run dev`

### Production Deployment

Set these environment variables in your deployment platform (Netlify, Vercel, GitHub Pages):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL` (your deployed domain)

See `docs/supabase.md` for full backend setup instructions (database schema, RLS policies, real-time config).

---

## Project Structure

```
DoWhat/
├── src/
│   ├── components/           # React components (.jsx)
│   ├── hooks/                # Custom React hooks
│   ├── supabaseClient.js     # Supabase config
│   ├── App.jsx               # Root component
│   └── main.jsx              # Entry point
├── docs/
│   ├── supabase.md           # Backend setup guide
│   └── roadmap.md            # Feature roadmap
├── tests/                    # Unit & integration tests
├── package.json
├── vite.config.js
└── AGENTS.md                 # Guidelines for coding agents
```

---

## Development Workflow

### Testing

```bash
npm test                       # Run all tests
npm test -- --watch           # Watch mode
npm test -- --coverage        # Coverage report
```

### Code Quality

```bash
npm run lint                   # Check for style issues
npm run lint -- --fix         # Auto-fix violations
```

---

## Future Roadmap

- [ ] **Recurring Tasks**: Create tasks that repeat daily, weekly, or monthly
- [ ] **Team Collaboration**: Share boards with team members and see real-time updates
- [ ] **Smart Reminders**: Get notifications before due dates
- [ ] **Task Templates**: Quickly create tasks from pre-built templates
- [ ] **Time Tracking**: Track how long tasks take (Pomodoro support)
- [ ] **Advanced Filtering**: Filter by multiple criteria (priority + category + due date)
- [ ] **Mobile App**: React Native app for iOS/Android
- [ ] **Calendar View**: Visualize tasks by date on an interactive calendar
- [ ] **Integrations**: Connect to Slack, Gmail, Discord for notifications
- [ ] **Data Export**: Export tasks to CSV, JSON, or Markdown
- [ ] **Offline Mode**: Full functionality without internet connection
- [ ] **Dark Mode Pro**: Custom color themes and accent colors

---

## Architecture

**Frontend**:

- React 18 with hooks
- Vite for lightning-fast dev/builds
- CSS for styling (no heavy frameworks)
- Vitest for unit tests

**Backend**:

- Supabase (PostgreSQL + Real-time)
- Vault-based access: tasks are isolated by a random token, PIN is hashed client-side
- Row-level security (RLS) for data privacy
- Real-time subscriptions for live sync

**Deployment**:

- GitHub Pages (static hosting)
- Environment variables for secrets

---

## Contributing

Found a bug? Have a feature idea? Contributions are welcome!

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make changes, test, commit
git push origin feature/your-feature

# Open a pull request
```

Before submitting, run:

```bash
npm run lint          # Fix style issues
npm test              # Ensure tests pass
```

See `AGENTS.md` for detailed code style guidelines and testing expectations.

---

## License

MIT © 2025

---

## Acknowledgments

- **Supabase** for a fantastic real-time backend
- **React** for a great component model
- **Vite** for incredibly fast builds
- Everyone who shared feedback during development

---

**Made with ✅ and a passion for productivity. Part of an ongoing weekend hackathon to tackle real-world problems, one sprint at a time.\*\***
