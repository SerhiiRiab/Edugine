# Edugine Design System

A reference design system for **Edugine** — a no-code platform that lets private language tutors assemble interactive online lessons from gamified activities (Swipe Battle, Speed Match, Group Story Builder, Roleplay Quest, Speed Debate). Target users: ESL tutors teaching teens and adults; small groups of 1‑4 students join with a 6‑character session code.

This system extracts the design language already used in the product source so designers and agents can produce on‑brand decks, mocks, marketing pages, and feature explorations.

---

## Sources

- **GitHub repo (primary source of truth):** [SerhiiRiab/Edugine](https://github.com/SerhiiRiab/Edugine) — Next.js 15 + Tailwind v4 + shadcn `radix-nova` + Supabase. Read `src/app/globals.css` for raw tokens, `src/components/ui/*` for the shadcn primitives, `src/components/tutor/*` for tutor‑app surfaces, and `src/components/play/player-view.tsx` for the student/player surface.
- **Brand mark:** the gradient "E" + Edugine wordmark PNG was provided as `uploads/fb39ffaf-f1df-4d4d-95f2-63598e1938cd.png` and re‑saved as `assets/edugine-logo-wordmark.png`.
- **Companion repo (not yet pulled in):** [SerhiiRiab/Englobal-academy](https://github.com/SerhiiRiab/Englobal-academy). The Edugine product is the focus of this system; explore the second repo if you need to design across a wider Englobal Academy ecosystem.

Readers with access can pull richer context (server actions, mechanic implementations under `src/lib/mechanics/*`) directly from the repos.

---

## Product surfaces

Edugine has **three** visually distinct surfaces. Treat them as separate themes that share a token system:

| Surface | Where | Vibe | Background |
|---|---|---|---|
| **Marketing & Auth** | `/`, `/login`, `/signup`, `/forgot-password` | Bold, vibrant, recruiting | Full‑bleed violet → purple → indigo gradient |
| **Tutor app** | `/tutor/*` (dashboard, content sets, lessons, sessions, settings) | Polished SaaS, professional | `slate-50` light surface with **dark violet‑950 sidebar** |
| **Player view** | `/play/[code]` — what students see on phones | Energetic, gamified, dark | `slate-900` dark with violet accents and big emoji |

The tutor app reads as a **trustworthy paid product** while the player and marketing views lean into the playful Gen‑Z energy. Use the right surface theme for the screen you're designing.

---

## Content fundamentals

**Voice.** Warm, energetic, slightly cheeky. Talks to the tutor as a peer ("Hey, {name}! 👋 / Ready to teach something awesome today?"), and to students like a friend ("Join →", "Waiting for teacher to start..."). Marketing copy is unabashedly playful — the literal hero headline in the codebase is *"The lesson engine that goes brrrr 🚀"*.

**Person.** Second person *you* dominates ("**Your** name", "**Your** Scores", "Build **your** first lesson"). The brand says *we* only when it implies the team behind the product.

**Casing.** **Sentence case everywhere** — headings, buttons, nav labels, badges. Title Case is reserved for proper nouns and feature names ("Swipe Battle", "Speed Match", "Group Story Builder", "Content Sets", "Lessons", "Sessions"). The wordmark "Edugine" is the only invariant capital.

**Punctuation.** Em dashes and ellipses are used freely ("Now in beta — free for tutors", "Joining..."). Sentences end without periods when they're inside a button or pill. Arrow glyphs replace "go" verbs in CTAs: `Sign up →`, `Go to Dashboard →`, `Join →`, `Sign in →`.

**Emoji is part of the type system.** It is a feature, not decoration — every mechanic, status, and key moment has a canonical emoji. Use them inline in headings, badges, and result screens, never as standalone icons in dense UI.

| Concept | Emoji | Used as |
|---|---|---|
| Lessons | 🎓 | Lesson card badge |
| Swipe Battle | 🎯 | Mechanic badge |
| Speed Debate | 💬 | Mechanic badge |
| Roleplay Quest | 🎭 | Mechanic badge |
| Group Story Builder | 📖 | Loading / mechanic |
| Rocket / launch | 🚀 | Hero, "Create your first lesson!" |
| Spark / magic | ✨ | Magic link, "for free ✨" CTA |
| Wave | 👋 | "Hey, {name}!", "Welcome back!" |
| Hourglass | ⏳ | Waiting room |
| Win tiers | 💪 🎉 🏆 | Score result by accuracy band |
| Star | ⭐ | Activity complete |
| Checkered flag | 🏁 | Session ended |
| Mail | 📬 | Magic‑link sent |
| Cross | ❌ | Invalid code |

**Specific copy patterns to keep using:**
- Empty / first‑run state titles end in an exclamation + emoji: "Create your first lesson! 🚀".
- Toasts are 2–3 words ("Set deleted", "Lesson duplicated!"), `sonner` `richColors`.
- Loading states use the verb + ellipsis form: "Joining...", "Signing in…", "Duplicating...".
- Time uses compact relative formatting: `just now`, `3m ago`, `2h ago`, `4d ago`.
- Session codes are uppercase, length 6, alphanumeric with `IO0LI1` excluded, displayed in monospace.

**What to avoid.** No formal "Welcome to Edugine. Please log in." stiffness. No "synergy / leverage / empower" SaaS‑speak. Don't drop emoji from the player view (it carries the playful energy on a dark surface). Don't use emoji in dense list rows or settings forms — keep those clean.

---

## Visual foundations

**Color story.** A single dominant hue — **violet** — carried through three temperatures: the loud violet→purple→indigo gradient for marketing, a `violet-600` solid for primary actions on light surfaces, and `violet-950` as a calm dark chrome for the tutor sidebar. Every gamified mechanic gets its own supporting hue (violet for Swipe Battle, blue for Speed Debate, orange for Roleplay Quest, emerald for success/team, amber for lessons, rose/red for danger). Neutrals are Tailwind **slate** end‑to‑end — `slate-50` for app bg, `slate-400` for muted copy, `slate-800` for body text, `slate-900` for the player surface.

**Type.** **Geist Sans** for everything UI; **Geist Mono** for session codes and any technical tokens. Weight is the main hierarchy lever — body sits at `400`, labels at `500`, buttons at `600–700`, headings at `800`, hero display at `800–900`. Headings use `tracking-tight` (`-0.02em`). The hero scales from `text-5xl` (mobile) to `text-7xl` (desktop). Body text uses `leading-relaxed`; tight headings use `leading-tight`.

**Spacing.** Tailwind 4px scale unchanged. Cards breathe with `p-5` to `p-8`; hero sections use `py-28`. Inputs are `py-3 px-4`. The dashboard is capped at `max-w-5xl` and the marketing hero at `max-w-4xl`, both centered.

**Backgrounds.**
- *Marketing & auth* — `bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700`, full bleed, no imagery.
- *Tutor app* — flat `slate-50` body, `violet-950` sidebar. **Hero CTA banners inside the dashboard** use a tighter `from-violet-500 to-purple-600` gradient on `rounded-3xl` with two decorative `bg-white/10 rounded-full` blobs in opposite corners.
- *Player view* — flat `slate-900`. No images, no gradients on the base surface. Result cards are tinted `{color}-500/10` with `border-{color}-500/20`.
- No photography or illustration is present in the codebase — all visual interest comes from gradients, color, type and the brand "E" mark.

**Animation & motion.** `framer-motion` is in the player view for participant join/leave (`opacity + x translate`, `duration: 0.25, delay: i * 0.05`). Cards in the tutor app lift on hover with `hover:scale-[1.02] transition-all duration-200`. The waiting room has three bouncing violet dots (`animate-bounce`, staggered 0.2s). Loading spinners are a 2px ring rotating. Hover transitions are short (`150–200ms`) and ease-out by default. **No big page transitions, no parallax, no fancy scroll effects** — energy comes from the gamified moments, not chrome motion.

**Hover & press.**
- Primary buttons: `bg-violet-600 hover:bg-violet-700 active:bg-violet-800`.
- White‑on‑gradient buttons: `bg-white text-violet-700 hover:bg-white/90`.
- Cards: border swaps from `slate-100` to `violet-200`, shadow steps from `sm` → `md`, and the whole card scales `1.02`.
- Icon buttons: opacity 0 → 100 on parent hover; rounded `lg`; background lifts to `slate-100`.
- Active state on buttons additionally `translate-y-px` (from the shadcn `button.tsx` base).

**Borders & dividers.** Default border is `1px solid slate-100` for cards (sometimes `border-2` on lesson/content cards so the violet hover swap is more dramatic). Divider lines between sections are `h-px bg-slate-200`. The player view uses `slate-700` and `slate-700/50` for borders on its dark surfaces.

**Shadows.** Three layers: `shadow-sm` for resting cards, `shadow-md` on hover, and `shadow-xl shadow-violet-900/20` (a **violet‑tinted** drop) on hero CTAs and the login card (`shadow-2xl shadow-violet-900/30`). No inner shadows. No long, soft, depth‑realistic shadows — the system is flat with one purposeful violet glow.

**Transparency & blur.** Used sparingly and only on the gradient surfaces. Pills on the marketing hero use `bg-white/10 backdrop-blur border border-white/20`. On dark surfaces (player), translucent layers are `bg-slate-800/60` over `slate-900`. Never blur on the light tutor surface.

**Corner radii.**
- Pills / badges → `rounded-full`.
- Icon tiles, small buttons → `rounded-lg` (10px).
- Buttons, inputs, nav items → `rounded-xl` (12px).
- Cards, modals → `rounded-2xl` (16px).
- Hero banners, login card, hero CTAs → `rounded-3xl` (24px).
- The brand mark itself uses a generous rounded rectangle; nothing in the brand is square‑cornered.

**Cards.** Standard tutor card = `bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm`. On hover: `hover:border-violet-200 hover:shadow-md hover:scale-[1.02]`. A small dropdown trigger fades in on group‑hover at top‑right. Most cards have: a colored pill badge at the top, a bold title, a 2‑line muted description, a `border-t` meta row at the bottom with `Clock`/icon + relative time.

**Stat tiles** (dashboard) = `bg-white rounded-2xl p-6 shadow-sm border border-slate-100`. Each tile has a `w-10 h-10 rounded-xl` accent square in `bg-{color}-100 text-{color}-600` containing a Lucide icon, an extrabold number, and a muted label. Always grouped in 3.

**Layout rules.**
- Sidebar (tutor app) fixed at `w-60`, sticky / overflow controlled by the shell.
- All page bodies center with `max-w-5xl mx-auto p-8` (dashboard) or smaller for forms.
- Auth pages center vertically and horizontally with `min-h-screen flex items-center justify-center p-4`.
- The player view never exceeds `max-w-sm` (single‑column phone target).

**Imagery vibe.** The codebase ships **zero** photo or illustration assets. The "imagery" of the brand *is* the gradient + the rainbow "E". When extra imagery is needed in a deck or mock, lean on solid color blocks, the gradient, and large emoji rather than introducing photography.

---

## Iconography

- **Primary system: [Lucide](https://lucide.dev) (`lucide-react`).** Every icon in the product comes from Lucide — strokes only, `1.5` weight, default size `w-4 h-4` (16px), occasionally `w-5 h-5` (20px) for nav and stat tiles. Icons in this system are loaded via the Lucide CDN (`https://unpkg.com/lucide@latest`) in the HTML mocks so designs match production exactly.
- **Confirmed usage from the codebase** (do not invent alternatives — pull from this set first): `LayoutDashboard`, `BookOpen`, `GraduationCap`, `Play`, `Settings`, `LogOut`, `MoreHorizontal`, `Edit2`, `Copy`, `Trash2`, `Clock`, `LayoutList`, `Eye`, `EyeOff`, `Users`, `ArrowRight`. (The source code uses a Lucide `Zap` as a temporary brand mark; the design system replaces it with the real gradient "E" — see `assets/edugine-mark.svg`.)
- **No icon font is bundled.** No FontAwesome / Material / Heroicons. Always reach for Lucide first.
- **Emoji functions as iconography in 3 places:**
  1. Mechanic badges (🎯 Swipe Battle, 💬 Speed Debate, 🎭 Roleplay Quest, 📖 Group Story).
  2. Status / outcome moments in the player view (🏆 / 🎉 / 💪 by score band, ⭐ for activity complete, 🏁 ⌛ ❌ 📬 for system states).
  3. Sentiment glyphs in headings and CTAs (👋, 🚀, ✨).
  Do **not** use emoji as standalone icons inside dense list rows, table cells, or settings forms — those are Lucide‑only territory.
- **Color treatment.** Lucide icons inherit color from text. In the tutor stat tiles they sit on a tinted square (`bg-{color}-100 text-{color}-600`). In the dark sidebar they're `violet-300` muted, `white` when active.
- **Logos / brand marks.** `assets/edugine-logo-wordmark.png` (full PNG provided by the founder), `assets/edugine-mark.svg` (isolated gradient "E"), `assets/edugine-lockup-light.svg` and `assets/edugine-lockup-dark.svg` (mark + wordmark, for light and dark surfaces).
- **Mark-vs-wordmark rule.** Use the gradient "E" mark on light, dark, or solid violet (`violet-950`) surfaces — anywhere the gradient inside the mark has enough contrast against the background. **On the violet → purple → indigo brand gradient, drop the "E" entirely** and use the **"Edugine" wordmark in white alone** — the mark's own gradient clashes with the surface and reads muddy. Sidebar (dark violet) keeps the mark; marketing hero / login / signup (all on the brand gradient) are wordmark-only.

---

## Index / manifest

```
.
├── README.md                       — this file
├── SKILL.md                        — agent‑skill manifest (cross‑compatible with Claude Code)
├── colors_and_type.css             — all design tokens (CSS variables) + semantic role classes
│
├── assets/
│   ├── edugine-logo-wordmark.png   — original PNG (founder‑supplied)
│   ├── edugine-mark.svg            — isolated gradient "E" mark
│   ├── edugine-lockup-light.svg    — mark + wordmark, dark text (use on light bg)
│   └── edugine-lockup-dark.svg     — mark + wordmark, white text (use on dark / gradient bg)
│
├── preview/                        — design‑system cards rendered in the Design System tab
│   ├── colors-*.html               — color palette specimens
│   ├── type-*.html                 — typography specimens
│   ├── spacing-*.html              — radii, shadows, spacing
│   └── components-*.html           — buttons, inputs, cards, badges, pills, mechanic tiles
│
└── ui_kits/                        — high‑fidelity HTML/JSX recreations of each product surface
    ├── marketing/                  — public landing + login + sign-up (gradient theme)
    ├── tutor-app/                  — dashboard, content sets, lessons (light theme + sidebar)
    └── player-view/                — student mobile join + waiting + game + result (dark theme)
```

---

## Caveats

- **Geist** is Vercel's font, available on Google Fonts under the same name. The system imports it from the Google Fonts CDN; if you ship for production swap to a self‑hosted copy.
- The icon set is loaded from the **Lucide CDN** in static mocks (versionless `unpkg.com/lucide@latest`). For a production design handoff, pin a version.
- The brand wordmark PNG is a single PNG, not a vector. The included SVGs (`edugine-mark.svg`, `edugine-lockup-*.svg`) are **approximations** built from the visible gradient stops and weight — flag any mismatch with the founder's master.
- No design tokens for charts, data‑viz, calendars, or rich text editing surfaces exist yet — these are not present in the current product.
