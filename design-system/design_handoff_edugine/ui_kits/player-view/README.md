# Player view UI kit

The student-side mobile experience. Dark surface (`slate-900`), single column, never wider than ~`max-w-sm`. Open the index in a phone frame to feel the constraints.

**Files**
- `index.html` — phone-shaped frame with click-thru between phases
- `NicknameScreen.jsx` — code + name entry
- `WaitingRoom.jsx` — student avatars with presence + bouncing-dot waiting state
- `SwipeBattle.jsx` — single Swipe Battle gameplay loop (5 demo cards)
- `ResultScreen.jsx` — trophy + stats + "review these" miss list

**Source**: `src/app/play/[code]/page.tsx`, `src/components/play/player-view.tsx`, and the per-mechanic components under `src/lib/mechanics/*`. The kit only demos Swipe Battle; Speed Match and Group Story Builder follow the same visual rules and can be built on top of these primitives.
