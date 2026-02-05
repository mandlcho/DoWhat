# DoWhat Agent Guidelines

This document provides guidelines for coding agents working on the DoWhat (todo-react-app) codebase.

## Build, Lint & Test Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build
```

### Testing
```bash
npm test                # Run all Vitest tests
npm test -- App.test    # Run tests matching "App.test"
npm test -- --watch    # Run in watch mode (re-run on file changes)
npm test -- --coverage # Generate coverage report
npm test -- --ui       # Open Vitest UI in browser
```

### Code Quality
```bash
npm run lint            # Run ESLint on src/ (detects style/errors)
npm run lint -- --fix   # Auto-fix ESLint violations
```

## Code Style Guidelines

### Imports
```javascript
// Standard order:
// 1. React/external libraries
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

// 2. Local components and hooks
import DoWhatApp from "./components/DoWhatApp";
import { useSession } from "./hooks/useSession";
import { TODO_PRIORITIES } from "./hooks/useTodos";

// 3. Styles
import "./App.css";
```

### File Organization
- **Components**: `src/components/*.jsx` - Each component in its own file
- **Hooks**: `src/hooks/*.js` - Custom React hooks (useSession, useTodos, useBoardDragAndDrop, etc.)
- **Utilities**: `src/supabaseClient.js` - Configuration and services
- **Styles**: `src/*.css` - Scoped to component (e.g., App.css for App.jsx)
- **Tests**: `src/*.test.jsx` - Colocated with source files

### Naming Conventions
```javascript
// Components: PascalCase, match filename
function TodoCard({ todo, onDelete }) { }           // TodoCard.jsx
function AppHeader() { }                            // AppHeader.jsx

// Hooks: camelCase with "use" prefix
function useTodos() { }                             // useTodos.js
function useSession() { }                           // useSession.js

// Constants: UPPER_CASE
const TODO_PRIORITIES = ["high", "medium", "low"];
const DEFAULT_PRIORITY = "medium";

// Functions/variables: camelCase
const mapTodoFromDatabase = (row) => { };
let selectedTodos = [];
```

### Formatting & Style Rules
- **Indentation**: 2 spaces (enforced by ESLint + Prettier)
- **Semicolons**: Required (ESLint rule: semi)
- **Quotes**: Double quotes for JSX strings (ESLint default)
- **Line length**: Aim for <100 chars when reasonable
- **Object shorthand**: Use ES6 shorthand where applicable
  ```javascript
  // Good
  { title, description, priority } = todo;
  const obj = { id, name };
  
  // Avoid
  const obj = { id: id, name: name };
  ```
- **Arrow functions**: Prefer for callbacks and functional expressions
- **Template literals**: Use backticks for multi-line or interpolated strings
  ```javascript
  const msg = `Todo: ${todo.title}`;
  ```

### ESLint Configuration
- **Extends**: eslint:recommended, plugin:react/recommended
- **React prop-types**: Off (use TypeScript-style JSDoc if needed)
- **Key rule**: Always provide `key` prop in lists (ESLint react/jsx-key)

### Type Hints (via JSDoc)
Document complex functions with JSDoc comments:
```javascript
/**
 * Map database row to frontend todo object
 * @param {Object} row - Database row from Supabase
 * @returns {Object|null} Todo object or null if invalid
 */
const mapTodoFromDatabase = (row) => {
  if (!row) return null;
  // ... implementation
};

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} status - "backlog", "todo", "in_progress", "done"
 * @property {string} priority - "high", "medium", "low"
 * @property {boolean} is_complete
 * @property {string[]} categories
 */
```

### Error Handling
```javascript
// Always catch Supabase errors
try {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId);
  
  if (error) throw error;
  return data;
} catch (err) {
  console.error("Failed to fetch todos:", err.message);
  // Show user-friendly error via UI state
  return [];
}

// Validate props in components
function TodoCard({ todo, onDelete }) {
  if (!todo || !todo.id) {
    console.warn("TodoCard: invalid todo prop", todo);
    return null;
  }
  // ... render
}
```

### React Patterns
- **Functional components**: Always use functional components with hooks
- **useState**: For local UI state (input values, UI toggles)
- **useEffect**: For side effects (fetch, subscriptions, cleanup)
- **useCallback**: Memoize callbacks passed to child components
- **useMemo**: Cache expensive calculations if re-renders are frequent
- **Fragment**: Use `<>...</>` for multiple JSX elements without wrapper
- **Keys in lists**: Always provide unique, stable `key` prop (not index)
  ```javascript
  // Good
  {todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
  
  // Avoid
  {todos.map((todo, i) => <TodoItem key={i} todo={todo} />)}
  ```

### Supabase Integration
- **Client**: Import from `src/supabaseClient.js`
- **Auth**: Use `useSession()` hook to check session state
- **Real-time**: Subscribe to changes using `.on()` in useEffect
- **Error handling**: Always check error object in destructured response

## Testing

### Test File Structure
```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it("renders title", () => {
    render(<App />);
    expect(screen.getByText(/title/i)).toBeInTheDocument();
  });

  it("handles todo creation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole("textbox"), "New todo");
    await user.click(screen.getByRole("button", { name: /add/i }));
    expect(screen.getByText("New todo")).toBeInTheDocument();
  });
});
```

### Testing Priorities
- **Critical paths**: User interactions (create, update, delete todos)
- **Component rendering**: Props passed correctly, children render
- **Hooks**: useTodos, useSession state changes
- **Edge cases**: Empty lists, null/undefined values, error states
- **Supabase integration**: Mock for tests to avoid DB dependencies

## Project Structure
```
DoWhat/
├── src/
│   ├── components/          # React components (.jsx)
│   │   ├── TodoCard.jsx
│   │   ├── TodoList.jsx
│   │   ├── DoWhatApp.jsx
│   │   ├── Auth.jsx
│   │   └── ...
│   ├── hooks/               # Custom React hooks (.js)
│   │   ├── useTodos.js
│   │   ├── useSession.js
│   │   ├── useBoardDragAndDrop.js
│   │   └── ...
│   ├── App.jsx              # Root component
│   ├── App.test.jsx         # App tests
│   ├── App.css              # App styles
│   ├── index.css            # Global styles
│   ├── main.jsx             # Entry point
│   └── supabaseClient.js    # Supabase config
├── docs/
│   ├── supabase.md          # DB schema, RLS policies
│   └── roadmap.md           # Feature roadmap
├── package.json
├── vite.config.js           # Vite config
├── vitest.config.js         # Vitest config
├── vitest.setup.js          # Test setup
├── .eslintrc.cjs            # ESLint rules
├── index.html
└── AGENTS.md                # This file
```

## Environment Variables
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SITE_URL=https://deployed-site.com  # For Supabase email links
```

Set in `.env` locally; production uses `.env.production` for GitHub Pages builds.

## Commit & PR Guidelines
- **Commit message**: `Add feature` or `Fix bug` (imperative mood)
- **Test before commit**: Run `npm test` and `npm run lint` locally
- **Single concern**: Keep commits focused on one feature/fix
- **Link issues**: Reference issue numbers in PR description
