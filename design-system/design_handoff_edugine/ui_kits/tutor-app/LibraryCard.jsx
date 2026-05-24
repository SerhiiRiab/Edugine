// Reusable Library card (used by both Content Sets & Lessons screens)
// Recreates the card layouts from src/components/tutor/content-set-card.tsx and lesson-card.tsx
const { BookOpen, Clock, LayoutList, MoreHorizontal } = window.EdugineIcons;

const MECHANIC_META = {
  swipe_battle: { label: 'Swipe Battle 🎯', bg: 'var(--violet-100)', fg: 'var(--violet-700)', border: 'var(--violet-200)' },
  speed_debate: { label: 'Speed Debate 💬', bg: 'var(--blue-100)',   fg: 'var(--blue-700)',   border: '#bfdbfe' },
  roleplay_quest: { label: 'Roleplay Quest 🎭', bg: 'var(--orange-100)', fg: 'var(--orange-700)', border: '#fed7aa' },
  story_builder: { label: 'Group Story 📖', bg: 'var(--emerald-100)', fg: '#047857', border: '#a7f3d0' },
  speed_match: { label: 'Speed Match ⚡', bg: '#fef3c7', fg: 'var(--amber-700)', border: 'var(--amber-200)' },
  lesson:       { label: '🎓 Lesson', bg: 'var(--amber-50)', fg: 'var(--amber-700)', border: 'var(--amber-200)' },
};

function LibraryCard({ title, description, mechanic, itemCount, itemLabel, ago }) {
  const m = MECHANIC_META[mechanic] || MECHANIC_META.swipe_battle;
  const [hover, setHover] = React.useState(false);
  const isLesson = mechanic === 'lesson';
  const Icon = isLesson ? LayoutList : BookOpen;

  return (
    <a style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      background: '#fff', borderRadius: 18, padding: 20,
      border: `2px solid ${hover ? 'var(--violet-200)' : 'var(--slate-100)'}`,
      boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      transform: hover ? 'scale(1.015)' : 'scale(1)',
      transition: 'all 200ms', cursor: 'pointer', minHeight: 170,
      textDecoration: 'none'
    }}
    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {/* Top-right kebab */}
      <button onClick={e => { e.preventDefault(); e.stopPropagation(); }} style={{
        position: 'absolute', top: 12, right: 12,
        opacity: hover ? 1 : 0, transition: 'opacity 150ms',
        width: 32, height: 32, borderRadius: 8, border: 0, background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        color: 'var(--slate-500)'
      }}>
        <MoreHorizontal width={16} height={16}/>
      </button>

      {/* Mechanic badge */}
      <span style={{
        alignSelf: 'flex-start', display: 'inline-flex', padding: '3px 11px',
        borderRadius: 9999, fontSize: 12, fontWeight: 600, marginBottom: 12,
        background: m.bg, color: m.fg, border: `1px solid ${m.border}`
      }}>{m.label}</span>

      <h3 style={{
        fontWeight: 700, fontSize: 16, lineHeight: 1.3, margin: '0 0 6px',
        color: hover ? 'var(--violet-700)' : 'var(--slate-800)',
        transition: 'color 150ms',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        paddingRight: 24
      }}>{title}</h3>

      {description && (
        <p style={{
          color: 'var(--slate-400)', fontSize: 13, lineHeight: 1.45, margin: '0 0 8px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>{description}</p>
      )}

      <div style={{ flex: 1 }}/>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, paddingTop: 12, marginTop: 16,
        borderTop: '1px solid var(--slate-100)', fontSize: 12, color: 'var(--slate-400)'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon width={14} height={14}/>
          {itemCount} {itemLabel}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Clock width={14} height={14}/>
          Updated {ago}
        </span>
      </div>
    </a>
  );
}

window.TutorLibraryCard = LibraryCard;
