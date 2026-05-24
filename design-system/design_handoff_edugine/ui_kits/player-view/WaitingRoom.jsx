// Player waiting room — recreates the "waiting" phase of player-view.tsx
const AVATAR_COLORS = [
  'var(--violet-500)', 'var(--emerald-500)', 'var(--amber-500)', 'var(--rose-500)', 'var(--sky-500)'
];

function WaitingRoom({ me = 'Alex', onStart }) {
  const others = [
    { id: 'm', name: 'Mira', online: true },
    { id: 'j', name: 'Jules', online: true },
    { id: 'p', name: 'Priya', online: false },
  ];
  const all = [{ id: 'me', name: me, online: true, isSelf: true }, ...others];

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 36 }}>⏳</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Waiting for teacher to start...</h2>
          <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: 0 }}>3 activities · 22 cards</p>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.6)', borderRadius: 16,
          border: '1px solid rgba(51, 65, 85, 0.5)', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'var(--slate-400)',
            letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0
          }}>
            In this room ({all.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {all.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 12,
                background: p.isSelf ? 'rgba(124, 58, 237, 0.20)' : 'rgba(51, 65, 85, 0.40)',
                border: p.isSelf ? '1px solid rgba(139, 92, 246, 0.40)' : '1px solid transparent'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9999,
                  background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, color: '#fff'
                }}>{p.name[0].toUpperCase()}</div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: p.isSelf ? '#fff' : 'var(--slate-200)' }}>
                  {p.name}
                  {p.isSelf && <span style={{ marginLeft: 6, color: 'var(--violet-300)', fontSize: 12, fontWeight: 400 }}>(you)</span>}
                </span>
                <span style={{
                  width: 8, height: 8, borderRadius: 9999,
                  background: p.online ? '#34D399' : 'var(--slate-600)'
                }}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 10, height: 10, borderRadius: 9999, background: 'var(--violet-400)',
              animation: `eg-bounce 1s ease-in-out ${i * 0.2}s infinite`
            }}/>
          ))}
        </div>

        {/* Dev convenience — not part of the real product */}
        <button onClick={onStart} style={{
          background: 'transparent', color: 'var(--slate-500)', border: '1px dashed var(--slate-700)',
          borderRadius: 12, padding: 10, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer'
        }}>simulate "teacher starts" →</button>

        <style>{`@keyframes eg-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
      </div>
    </div>
  );
}

window.PlayerWaitingRoom = WaitingRoom;
