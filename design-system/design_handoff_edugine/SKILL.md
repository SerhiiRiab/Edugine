---
name: edugine-design
description: Use this skill to generate well-branded interfaces and assets for Edugine, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key references:
- `README.md` — full brand voice, visual foundations, iconography rules.
- `colors_and_type.css` — all tokens as CSS variables (`--violet-600`, `--font-sans`, etc).
- `assets/` — logo PNG + SVG lockups.
- `ui_kits/marketing/`, `ui_kits/tutor-app/`, `ui_kits/player-view/` — three product surfaces with reusable JSX components. Pick the right surface for the screen.
- `preview/` — small HTML specimens of every token and component (handy as visual reference).

Three surfaces, three themes (do not mix):
1. **Marketing / Auth** — violet→purple→indigo gradient, glass pills, white type, big emoji.
2. **Tutor app** — slate-50 light surface, dark violet-950 sidebar, white rounded-2xl cards.
3. **Player view** — slate-900 dark, mobile-only, single column ≤ max-w-sm, big emoji.

When in doubt: use Geist + Lucide + sentence case + an emoji where the codebase already uses one.
