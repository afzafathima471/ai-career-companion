# Setting this up in your project

You already have `frontend/` running with Vite. Drop these files in, then run three install commands.

## 1. Copy files
Copy everything in this folder into `frontend/`, keeping the structure:
- `tailwind.config.js` → `frontend/tailwind.config.js`
- `postcss.config.js` → `frontend/postcss.config.js`
- `src/index.css` → overwrite `frontend/src/index.css`
- `src/App.jsx` → overwrite `frontend/src/App.jsx`
- `src/components/*.jsx` → `frontend/src/components/`
- `src/pages/*.jsx` → `frontend/src/pages/`

## 2. Install dependencies
From inside `frontend/`:

```
npm install -D tailwindcss postcss autoprefixer
npm install lucide-react
```

(No need to run `npx tailwindcss init` — the config file is already included.)

## 3. Run it
```
npm run dev
```

You should see the sidebar (Dashboard, Resume, Internships, Interview, Applications), the topbar with your name, three stat cards (Resume score, Matches, Applied), and the recommended internships list — clicking a sidebar item swaps the page title and shows a placeholder for now.

## Next pages to build
`App.jsx` already has the routing hook (`active` state) — for now, non-Dashboard pages show a placeholder. When you're ready to demo more than the dashboard, we can build out Resume, Internships, Interview, and Applications the same way: a page component in `src/pages/`, wired into the `if (active === "...")` branch (or swapped for `react-router` once you have real routes to link to).
