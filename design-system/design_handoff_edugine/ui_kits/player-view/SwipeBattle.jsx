// Swipe Battle gameplay screen — pattern matches src/lib/mechanics/swipe-battle/PlayerComponent.
// One word/translation pair per card; swipe left = incorrect, right = correct.
const { X, Check } = window.EdugineIcons;

const CARDS = [
  { id: 1, word: 'wake up',       translation: 'to stop sleeping',           isCorrect: true },
  { id: 2, word: 'get up',        translation: 'to leave a building',        isCorrect: false },
  { id: 3, word: 'look after',    translation: 'to take care of someone',    isCorrect: true },
  { id: 4, word: 'put off',       translation: 'to delay or postpone',       isCorrect: true },
  { id: 5, word: 'turn down',     translation: 'to increase the volume',     isCorrect: false },
];

function SwipeBattle({ onFinish }) {
  const [idx, setIdx] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [correct, setCorrect] = React.useState(0);
  const [drag, setDrag] = React.useState(0); // -1..1
  const [exiting, setExiting] = React.useState(null); // 'left' | 'right' | null

  const card = CARDS[idx];

  function answer(direction) {
    if (exiting) return;
    setExiting(direction);
    const userSays = direction === 'right';
    const wasRight = userSays === card.isCorrect;
    if (wasRight) { setCorrect(c => c + 1); setScore(s => s + 20); }
    setTimeout(() => {
      setExiting(null);
      setDrag(0);
      if (idx + 1 >= CARDS.length) {
        onFinish({ correct: wasRight ? correct + 1 : correct, total: CARDS.length, score: wasRight ? score + 20 : score });
      } else {
        setIdx(i => i + 1);
      }
    }, 280);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Swipe Battle 🎯
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a78bfa', fontSize: 14 }}>
          {idx + 1} / {CARDS.length}
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 4 }}>
        {CARDS.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < idx ? 'var(--violet-500)' : i === idx ? 'rgba(139, 92, 246, 0.4)' : 'var(--slate-700)'
          }}/>
        ))}
      </div>

      {/* Card area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Behind card (next) */}
        {idx + 1 < CARDS.length && (
          <div style={{
            position: 'absolute', width: '85%', maxWidth: 320, top: '50%', left: '50%',
            transform: 'translate(-50%, -42%) scale(0.92)',
            background: 'var(--slate-800)', borderRadius: 20, padding: 32,
            border: '1px solid var(--slate-700)', opacity: 0.5
          }}>
            <div style={{ height: 80 }}/>
          </div>
        )}

        {/* Active card */}
        <div style={{
          position: 'relative', width: '90%', maxWidth: 340,
          background: 'var(--slate-800)', borderRadius: 20, padding: '40px 28px',
          border: '1px solid var(--slate-700)', textAlign: 'center',
          transform: exiting === 'right' ? 'translateX(120%) rotate(18deg)'
                    : exiting === 'left' ? 'translateX(-120%) rotate(-18deg)'
                    : `translateX(${drag * 0}px) rotate(${drag * 0}deg)`,
          transition: exiting ? 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 200ms',
          boxShadow: '0 24px 56px -12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--slate-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 16 }}>
            Match this card?
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 14 }}>
            {card.word}
          </div>
          <div style={{ height: 1, background: 'var(--slate-700)', margin: '14px 0' }}/>
          <div style={{ fontSize: 18, color: 'var(--slate-300)', lineHeight: 1.5 }}>
            {card.translation}
          </div>
        </div>
      </div>

      {/* Score row */}
      <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', fontSize: 12 }}>
        <div><div style={{ color: 'var(--emerald-400)', fontSize: 20, fontWeight: 800 }}>{correct}</div><div style={{ color: 'var(--slate-500)' }}>Correct</div></div>
        <div><div style={{ color: '#a78bfa', fontSize: 20, fontWeight: 800 }}>{score}</div><div style={{ color: 'var(--slate-500)' }}>Points</div></div>
        <div><div style={{ color: 'var(--slate-300)', fontSize: 20, fontWeight: 800 }}>{CARDS.length - idx - 1}</div><div style={{ color: 'var(--slate-500)' }}>Left</div></div>
      </div>

      {/* Swipe buttons */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', paddingTop: 4 }}>
        <button onClick={() => answer('left')} style={{
          width: 64, height: 64, borderRadius: 9999,
          background: 'rgba(239, 68, 68, 0.10)', border: '2px solid rgba(239, 68, 68, 0.30)',
          color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}><X width={28} height={28}/></button>
        <button onClick={() => answer('right')} style={{
          width: 64, height: 64, borderRadius: 9999,
          background: 'rgba(16, 185, 129, 0.10)', border: '2px solid rgba(16, 185, 129, 0.30)',
          color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}><Check width={28} height={28}/></button>
      </div>
    </div>
  );
}

window.PlayerSwipeBattle = SwipeBattle;
