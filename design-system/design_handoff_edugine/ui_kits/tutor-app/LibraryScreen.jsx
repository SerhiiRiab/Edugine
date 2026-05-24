// Library screen — used for both Content Sets and Lessons pages.
const { Plus, Search } = window.EdugineIcons;
const LibraryCard = window.TutorLibraryCard;

const SAMPLE = {
  contentSets: [
    { title: 'Phrasal verbs · daily routines', description: 'Quick 5-minute warm-up for B1 learners covering wake up, get up, look after.', mechanic: 'swipe_battle', itemCount: 12, ago: '3h ago' },
    { title: 'Cooking vocabulary', description: 'Verbs for slicing, frying, mixing — paired with images.', mechanic: 'swipe_battle', itemCount: 24, ago: '1d ago' },
    { title: 'Strong opinions debate prompts', description: 'Should remote work be mandatory? 8 contrarian prompts ready to spark.', mechanic: 'speed_debate', itemCount: 8, ago: '2d ago' },
    { title: 'Restaurant roleplay scenarios', description: 'You + your waiter. Allergies, dietary requests, sending things back.', mechanic: 'roleplay_quest', itemCount: 6, ago: '5d ago' },
    { title: 'Idioms about money', description: 'Penny-pincher to break the bank — 14 cards with translations.', mechanic: 'speed_match', itemCount: 14, ago: '1w ago' },
    { title: 'Adventure story prompts', description: 'Hooks for collaborative storytelling. Setting + character + twist.', mechanic: 'story_builder', itemCount: 10, ago: '2w ago' },
  ],
  lessons: [
    { title: 'Intermediate · ordering food', description: '3 activities — vocab swipe, roleplay quest, speed match review.', mechanic: 'lesson', itemCount: 3, ago: '1d ago' },
    { title: 'B1 module 4 — travel & transport', description: '5 activities including a group story builder warm-down.', mechanic: 'lesson', itemCount: 5, ago: '3d ago' },
    { title: 'First lesson with new student', description: '2 activities, low-pressure swipe + a story builder ice-breaker.', mechanic: 'lesson', itemCount: 2, ago: '1w ago' },
  ],
};

function LibraryScreen({ kind = 'contentSets' }) {
  const isLessons = kind === 'lessons';
  const items = SAMPLE[kind];
  const title = isLessons ? 'Lessons' : 'Content Sets';
  const subtitle = isLessons
    ? 'Multi-activity flows you can launch as a single session.'
    : 'Reusable card decks — vocabulary, prompts, roleplay scenarios.';
  const itemLabel = isLessons ? 'activities' : 'cards';
  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--slate-800)', margin: 0, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <p style={{ color: 'var(--slate-400)', marginTop: 4, fontSize: 14 }}>{subtitle}</p>
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--violet-600)', color: '#fff', fontWeight: 600,
          padding: '10px 18px', borderRadius: 12, border: 0, cursor: 'pointer', fontSize: 14
        }}>
          <Plus width={16} height={16}/>
          New {isLessons ? 'lesson' : 'content set'}
        </button>
      </div>

      {/* Search */}
      <div style={{
        background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24
      }}>
        <Search width={16} height={16} style={{ color: 'var(--slate-400)' }}/>
        <input placeholder={`Search ${isLessons ? 'lessons' : 'content sets'}…`} style={{
          flex: 1, border: 0, outline: 0, fontFamily: 'inherit', fontSize: 14, color: 'var(--slate-800)'
        }}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {items.map((it, i) => (
          <LibraryCard key={i} {...it} itemLabel={itemLabel}/>
        ))}
      </div>
    </div>
  );
}

window.TutorLibraryScreen = LibraryScreen;
