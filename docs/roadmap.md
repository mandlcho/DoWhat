# Todo React App Roadmap

## Phase 0 – Foundations

- Initialize Vite + React project structure with local development scripts.
- Configure ESLint + Prettier defaults; add `.gitignore` and basic README.
- Implement `useTodos` hook backed by `localStorage` for persistence.

## Phase 1 – Core Todo Experience

- Build todo list UI with add, toggle complete, and delete interactions.
- Support inline editing and completion timestamps in state.
- Add persistence syncing (hydrate from storage on load, write on change).
- Cover key behavior with React Testing Library + Vitest.

## Phase 2 – UX & Accessibility

- Introduce filtering (all / active / completed) and search.
- Add simple prioritization and due date metadata.
- Improve keyboard navigation, ARIA roles, focus management, and responsive layout.

## Phase 3 – Optional Cloud Sync

- Optionally integrate a lightweight backend (Supabase/Firebase or custom API).
- Add user sign-in and sync local todos to remote store with conflict handling.
- Provide import/export and data reset utilities for users.

---

## Session Notes – 2026-02-05

All 20 items below were implemented and verified. Tests (7/7) and lint pass. See "completed" notes for per-item detail.

### Priority 1 – Quick wins (high value, low effort)

- [x] **Make due date optional at creation.** Removed the hard gate in `handleSubmit`. `due_date: null` flows through.
- [x] **Hide sync status when synced.** Badge conditional on `syncState !== "synced"` in both `TodoCard` and `TodoListItem`.
- [x] **Fix "clear completed" – archives, not deletes.** `archiveCompleted` now calls `updateTodo(id, { archivedAt })`.
- [x] **Add a close button to the archive drawer.** X button added to `ArchiveDrawer` header; wired via `onClose`.

### Priority 2 – Medium effort, noticeable UX lift

- [x] **Add priority selector to the composer.** Three-button row (High / Medium / Low) in `TodoComposer`. Resets to `medium` after submit.
- [x] **Collapse timestamps by default.** Only `due` shown initially; `details` / `less` toggle expands created / activated / done.
- [x] **Replace `window.confirm` dialogs with in-app confirmations.** Backlog delete → `.confirm-bar` strip. Category delete → inline `.category-confirm` in `CategoryPanel`. Tag X buttons are the primary removal path.
- [x] **Add task count to board column headers.** `<span className="column-count">{todos.length}</span>` appended to each column `<h2>`.
- [x] **Allow colour selection when creating a category.** Eight preset swatches rendered in the add form; colour passed through to `addCategory`.

### Priority 3 – Larger features

- [x] **Add search.** `searchQuery` state + filter applied to both list and board views. Input in the composer filter row.
- [x] **Touch-friendly category removal.** X button (`category-tag-remove`) inside every tag in `TodoCard`, `TodoListItem`, and `ArchiveDrawer`.
- [x] **Mobile board view.** CSS stacks columns vertically below 640 px.
- [x] **Forgot password flow.** `resetPasswordForEmail` wired in `Auth.jsx`; success / error shown in existing message area.
- [x] **Onboarding / empty state.** Zero-task and per-filter empty states now show contextual hints.

### Priority 4 – Polish & consistency

- [x] **Terminology: "task" everywhere.** All user-facing strings and aria-labels standardised.
- [x] **Rename "card" view toggle to "board".** Done in `AppHeader`.
- [x] **Skeleton loading state.** Animated pulse skeleton replaces `<div>Loading...</div>`.
- [x] **Remove redundant refetch after add.** Post-insert block returns directly; realtime + optimistic update handle state.
- [x] **Category cascade on delete.** `handleRemoveCategory` strips the deleted category ID from every todo that references it.

### Post-implementation fixes (same session)

- Fixed archive test: replaced stale `/^archive$/i` selector with the actual footer button (`clear 1 completed task`).
- Fixed category-delete test: added click-through on the new inline confirmation strip before asserting removal.
- Added `react/react-in-jsx-scope: off` to `.eslintrc.cjs` (React 17+ JSX transform does not require the import).
- Removed unused `useMemo` import in `useBoardDragAndDrop.js` and unused `useCallback` import in `useCategories.js`.
