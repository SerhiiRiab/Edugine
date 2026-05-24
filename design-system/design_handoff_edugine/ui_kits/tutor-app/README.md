# Tutor app UI kit

The signed-in tutor experience — `slate-50` body with a fixed `violet-950` sidebar. Side-nav routes between Dashboard, Content Sets, Lessons, Sessions, Settings.

**Files**
- `index.html` — click-thru shell, navigates between screens via the sidebar
- `Sidebar.jsx` — dark-violet sidebar with active/hover states
- `DashboardScreen.jsx` — greeting, three stat tiles, hero CTA banner, recent activity rail
- `LibraryScreen.jsx` — list/grid layout shared by Content Sets + Lessons
- `LibraryCard.jsx` — single card primitive (badge + title + meta footer)
- `SessionsScreen.jsx` — live session panel (dark) + recent sessions list

**Source**: `src/app/tutor/*`, `src/components/tutor/*` in the Edugine repo. The Settings screen is intentionally blank — the source repo has not built it yet.
