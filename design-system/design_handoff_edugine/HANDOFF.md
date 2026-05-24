# Handoff: Edugine design system

## Overview

This bundle is the full Edugine design system: brand foundations (color, type, motion, spacing), iconography rules, content/voice guidelines, and three high-fidelity UI kits (Marketing, Tutor App, Player View). The work was built from the existing Edugine source at **https://github.com/SerhiiRiab/Edugine** — the design language is **already implemented there at MVP fidelity** in `globals.css` + the `src/components/*` tree. This handoff codifies what's in the repo, fills the gaps, and gives you a single reference to ship the rest of the product against.

## About the design files

The HTML and JSX files in this bundle are **design references**, not production code. They use React + Babel-in-browser to demo the look and behavior; do not ship them as-is. Your task is to **recreate these designs in the existing Edugine codebase** — Next.js 15 (App Router) + Tailwind v4 + shadcn `radix-nova` + `lucide-react` + Supabase, as configured in `package.json` and `components.json`. Where the repo already has the pattern (e.g. `src/components/tutor/tutor-shell.tsx` for the sidebar), match that style. Where the repo doesn't have the pattern yet (e.g. Settings screen), the kit shows what to build.

## Fidelity

**High-fidelity.** Pixel-perfect mocks with final colors, typography, spacing, radii, and shadows. All values come from the source repo's `src/app/globals.css` or are direct extrapolations of patterns already in `src/components/*`. Use the token names exactly when wiring Tailwind classes.

## What's inside

```
design_handoff_edugine/
├── HANDOFF.md                   ← you are here
├── design_system_README.md      ← full brand/voice/visual rules (READ THIS)
├── SKILL.md                     ← Claude Skill manifest for this system
├── colors_and_type.css          ← all design tokens as CSS variables
│
├── assets/
│   ├── edugine-logo-wordmark.png     ← founder-supplied master (raster)
│   ├── edugine-mark.svg              ← isolated gradient "E" (approximation)
│   ├── edugine-lockup-light.svg      ← mark + wordmark on light bg
│   └── edugine-lockup-dark.svg       ← mark + wordmark on dark bg
│
├── preview/                     ← small specimens — each token/component as a tiny HTML card
│
└── ui_kits/
    ├── _shared/icons.jsx        ← shared Lucide icon set
    ├── marketing/               ← landing / login / signup (gradient theme)
    ├── tutor-app/               ← dashboard / library / sessions (light + dark sidebar)
    └── player-view/             ← phone-sized join / waiting / game / result (dark)
```

Each `ui_kits/*/index.html` is a runnable click-thru of that surface.

## Tech stack — match the existing repo

Confirmed in the Edugine codebase:

| | Version | Source |
|---|---|---|
| Framework | Next.js **15.5.18** (App Router, `--turbopack`) | `package.json` |
| Styling | Tailwind CSS **v4** (via `@tailwindcss/postcss`) | `package.json` |
| Component lib | shadcn (style `radix-nova`, base color `neutral`) | `components.json` |
| Icons | **`lucide-react`** | `package.json` + every component imports from it |
| Animation | **`framer-motion`** | `package.json` + `player-view.tsx` |
| Toasts | **`sonner`** (`richColors`, `position="bottom-right"`) | `src/app/layout.tsx` |
| DnD | `@dnd-kit/core` + `@dnd-kit/sortable` | `package.json` |
| Backend | Supabase (SSR + Realtime) | `@/lib/supabase/*` |
| Font | **Geist + Geist Mono** via `next/font/google` | `src/app/layout.tsx` |

Stay inside this stack. Do not introduce additional UI libraries.

## Three surfaces — three themes

Edugine has three visually distinct surfaces. Do not mix.

| Surface | Routes | Theme |
|---|---|---|
| **Marketing & Auth** | `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | Full-bleed `from-violet-500 via-purple-600 to-indigo-700`. White type. Glass pills (`bg-white/10 backdrop-blur border border-white/20`). **No `<E>` mark on the gradient — wordmark only in white.** |
| **Tutor app** | `/tutor/*` | `bg-slate-50` body, fixed `w-60 bg-violet-950` sidebar, white `rounded-2xl border-2 border-slate-100` cards with `hover:border-violet-200 hover:shadow-md hover:scale-[1.02]`. |
| **Player view** | `/play/[code]` | `bg-slate-900` mobile-first. Max width ≈ `max-w-sm`. Big emoji moments (🏆/🎉/💪/⭐/⏳/🏁). Result tiles use tinted `{color}-500/10` over `slate-900`. |

## Design tokens

**All tokens live in `colors_and_type.css` as CSS variables, and in `src/app/globals.css` as Tailwind v4 `@theme` values** (the existing repo's pattern). Use Tailwind utility classes wherever possible — the codebase already does. The handoff CSS file is a fallback / cross-reference, not a replacement.

### Brand color
- Primary action: `violet-600` (`#7c3aed`). Hover `violet-700`, active `violet-800`.
- Sidebar / dark chrome: `violet-950` (`#2e1065`).
- Marketing gradient: `linear-gradient(135deg, violet-500, purple-600, indigo-700)`.
- Brand logomark gradient (the "E"): `#FFB300 → #FF3D7F → #A020F0 → #2A6BFF`, top-left to bottom-right.

### Neutrals
Tailwind **slate** end-to-end. App bg `slate-50`, body text `slate-800`, muted `slate-400`, borders `slate-100` / `slate-200`. Player surface `slate-900`, dark borders `slate-700`.

### Mechanic accents (one hue per gamified activity)
| Mechanic | Pill bg / fg | Emoji |
|---|---|---|
| Swipe Battle | `violet-100` / `violet-700` | 🎯 |
| Speed Debate | `blue-100` / `blue-700` | 💬 |
| Roleplay Quest | `orange-100` / `orange-700` | 🎭 |
| Group Story | `emerald-100` / `emerald-700` | 📖 |
| Speed Match | `amber-50` / `amber-700` | ⚡ |
| Lesson container | `amber-50` / `amber-700` | 🎓 |

### Typography
- Family: **Geist** (sans), **Geist Mono** (codes only).
- Display hero: `clamp(48px, 8vw, 72px)`, `font-extrabold`, `tracking-tight` (`-0.025em`), `leading-tight`.
- H1 (page title): `text-3xl font-extrabold tracking-tight`.
- H2 (card section): `text-2xl font-bold`.
- Body: `text-base` (16px), `leading-relaxed` (1.6).
- Labels: `text-sm font-medium text-slate-700`.
- Captions: `text-xs font-semibold uppercase tracking-wide text-slate-400`.
- Session codes: Geist Mono, uppercase, `tracking-wide`. 6 chars from `[A-HJ-NP-Z2-9]`.

### Radii
| Token | Value | Use |
|---|---|---|
| `rounded-lg` | 8–10px | icon tiles, small buttons |
| `rounded-xl` | 12px | **buttons, inputs, nav items** |
| `rounded-2xl` | 16px | **cards, modals** |
| `rounded-3xl` | 24px | hero CTAs, login card |
| `rounded-full` | pill | badges, pills |

### Shadows
- `shadow-sm` — cards at rest
- `shadow-md` — cards on hover
- `shadow-xl shadow-violet-900/20` — hero CTAs, login card (signature **violet-tinted** drop)
- No inner shadows. No long fuzzy realistic shadows.

### Motion
- Default duration: **200ms**, ease-out.
- Card hover: `transition-all duration-200`, lifts to `hover:scale-[1.02]`.
- `framer-motion` only where present in the source (participant join/leave). Don't add more.
- Loading: 2px ring `border-white/30 border-t-white animate-spin`.
- Pulse dot (live indicators): `animate-pulse`.
- Bouncing dots (waiting room): three dots, `animate-bounce`, staggered `0.2s`.

## Brand mark rules

The brand has **two mark forms** and a strict context rule:

| Context | What to render |
|---|---|
| White / light surfaces | Mark + "Edugine" wordmark (`assets/edugine-lockup-light.svg`). |
| Dark / `slate-900` / **solid `violet-950` sidebar** | Mark + "Edugine" wordmark, white text (`assets/edugine-lockup-dark.svg`). Sidebar uses 32×32 mark + 18px wordmark, gap 10. |
| **Violet → purple → indigo brand gradient** (marketing hero, login, signup) | **Wordmark only, in white.** Do not place the gradient "E" on the brand gradient — they clash. |

The current source repo (`src/components/tutor/tutor-shell.tsx`, `src/app/page.tsx`, `src/app/(auth)/login/page.tsx`) uses a yellow `Zap` icon as a **placeholder brand mark**. Replace it everywhere with the real gradient "E" — and on the marketing/auth gradient surfaces, drop the mark entirely per the rule above.

## Iconography

- **`lucide-react` only.** Stroke weight 2 (default). Default size `w-4 h-4`, sometimes `w-5 h-5` for nav and stat tiles.
- Confirmed icons used: `LayoutDashboard`, `BookOpen`, `GraduationCap`, `Play`, `Settings`, `LogOut`, `MoreHorizontal`, `Edit2`, `Copy`, `Trash2`, `Clock`, `LayoutList`, `Eye`, `EyeOff`, `Users`, `ArrowRight`.
- **Emoji is a deliberate part of the type system** for mechanic badges and outcome moments. Keep it in headings, badges, result screens. Do **not** use emoji as standalone icons inside dense list rows, table cells, or settings forms — those are Lucide-only.

## Voice / copy

- **Sentence case everywhere.** Headings, buttons, nav, badges. Title case only for proper nouns and feature names ("Swipe Battle", "Content Sets").
- Second person *you*. "Your name", "Your scores", "Create your first lesson".
- Energetic, slightly cheeky. The hero literally reads "The lesson engine that goes brrrr 🚀". Keep that energy.
- Arrows in CTAs: `Sign in →`, `Sign up →`, `Go to Dashboard →`, `Join →`.
- Em dashes and ellipses freely. Loading verbs: "Joining...", "Signing in…".
- Relative time: `just now`, `3m ago`, `2h ago`, `4d ago`.

## Screens covered

### Marketing (`ui_kits/marketing/`)
1. **Landing** — gradient hero, "beta" pill with pulsing green dot, headline + subhead + two CTAs ("Get started for free ✨" primary white-on-violet, "Sign in" glass), three-card "what's inside" rail with glass surfaces.
2. **Login** — white `rounded-3xl` card on gradient. Email + password (eye toggle), "Forgot password?" link, divider, secondary "Send magic link instead ✨" outline button, "Magic link sent" success state.
3. **Signup** — same surface treatment; three fields (name, email, password) + "Create account →" primary.

### Tutor app (`ui_kits/tutor-app/`)
1. **Shell** — fixed 240px sidebar with violet-950 bg, logo lockup, 5 nav items (Dashboard, Content Sets, Lessons, Sessions, Settings), user email + logout footer.
2. **Dashboard** — greeting ("Hey, {name}! 👋"), 3 stat tiles (Content Sets, Active Sessions, Total Plays) with `bg-{color}-100 text-{color}-600` icon squares, large violet-gradient CTA banner with two decorative blob circles, recent-activity rail.
3. **Library (Content Sets / Lessons)** — page header + "New …" primary button, search input, responsive card grid (auto-fill min 280px). Each card: mechanic badge pill → bold title → 2-line description → border-t footer with item count + "Updated 3h ago".
4. **Sessions** — featured live-session panel on `slate-900` showing a giant `M3K9P2` code in Geist Mono violet, participant list with green presence dots, "Start activity" / "End" buttons. Below: list of recent sessions with code pill + meta.
5. **Settings** — intentionally left blank with a "not present in source yet" note.

### Player view (`ui_kits/player-view/`) — mobile only
1. **Nickname** — emoji icon + lesson title + activity count + code in Geist Mono violet + nickname input + Join CTA.
2. **Waiting** — ⏳ + "Waiting for teacher to start..." + participant list with avatar circles + presence dots + three bouncing violet dots.
3. **Swipe Battle gameplay** — card stack with active card on `slate-800`, prompt → word → divider → translation. Progress bar (4px segmented), score row (Correct / Points / Left), two big circular ✓/✗ buttons.
4. **Result** — trophy emoji by accuracy band (🏆 ≥80%, 🎉 ≥50%, 💪 <50%), three tinted stat tiles, "Review these" miss list.

## State management

Use what the source already uses:
- **Supabase Auth** for sign-in/sign-up/magic link (see `src/app/(auth)/login/page.tsx`).
- **Supabase Realtime channels** for live sessions and player presence (see `src/components/play/player-view.tsx` for the full pattern — channel name `session:${id}`, presence + broadcast events `game_started` / `activity_advance` / `story_state_update` / `lesson_complete` / `game_ended`).
- **localStorage** for participant identity reconnect (`participant_${session.id}` key).
- React state for UI mode toggles (e.g. login `showMagicLink`, `magicSent`).

## Hover / press / focus states (don't skip these)

- Primary buttons: `bg-violet-600 hover:bg-violet-700 active:bg-violet-800 active:translate-y-px`.
- White-on-gradient: `bg-white text-violet-700 hover:bg-white/90`.
- Cards: `border-slate-100 → hover:border-violet-200`, `shadow-sm → hover:shadow-md`, `hover:scale-[1.02]`, all `transition-all duration-200`.
- Icon buttons inside cards: `opacity-0 group-hover:opacity-100`, `hover:bg-slate-100`, `rounded-lg`.
- Inputs focused: ring `ring-2 ring-violet-500/20` + `border-violet-500`.
- Sidebar nav: at rest `text-violet-300`, hover `bg-violet-800/60 text-white`, active `bg-violet-600 text-white`.

## Assets

- `assets/edugine-logo-wordmark.png` — founder-supplied wordmark master (raster).
- `assets/edugine-mark.svg` — isolated "E" mark. **Approximation**, not the official vector — request the original from the founder before launch.
- `assets/edugine-lockup-light.svg`, `edugine-lockup-dark.svg` — full lockups.
- No photography, illustration, or 3D in the brand. Imagery is the gradient + the mark. Leave space rather than inventing.

## Implementation order (suggested)

1. Replace the placeholder `Zap` brand mark across the existing repo with `assets/edugine-mark.svg` (and drop it entirely from `src/app/page.tsx` + `src/app/(auth)/*` per the gradient rule).
2. Build the **Settings** page in `src/app/tutor/settings/page.tsx` following the dashboard's spacing + card patterns.
3. Wire the **`/signup`** card if not already there, matching `LoginCard.jsx` from this kit.
4. Add the **"What's inside" rail** to the landing page (three glass cards) per `ui_kits/marketing/Landing.jsx`.
5. Add the **recent-activity rail** to the dashboard per `ui_kits/tutor-app/DashboardScreen.jsx`.

## Caveats

- The `Zap` icon was used in the source repo as a placeholder mark. The handoff replaces it. Discuss with the founder if you'd prefer to keep `Zap` somewhere.
- The "E" mark SVGs in `assets/` are **approximations** drawn from the wordmark PNG. Request the founder's master vector before any printed or large-format use.
- The companion repo `SerhiiRiab/Englobal-academy` was **not pulled into this system**. If the Edugine product needs to share design with a broader Englobal Academy ecosystem, audit that repo and reconcile.
- Settings, lesson editor, and the per-mechanic player components (Speed Match, Story Builder, Roleplay Quest) are not built in the source yet — the kits only demonstrate Swipe Battle. Extend from the patterns shown.

## Reference files

- **`design_system_README.md`** — full brand voice, content rules, visual foundations, iconography. **Read this first.**
- **`colors_and_type.css`** — every token as a CSS variable, with semantic role classes.
- **`ui_kits/*/README.md`** — per-kit notes on what's included.
- **`preview/*.html`** — open these locally to see tokens in isolation.
