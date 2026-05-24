// Sessions screen — host-side view of a live session (recreates the
// "Game in progress" host shell from src/components/tutor/session-host-view.tsx).
const { Play, Users, Clock } = window.EdugineIcons;

function SessionsScreen() {
  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--slate-800)', margin: 0, letterSpacing: '-0.02em' }}>
          Sessions
        </h1>
        <p style={{ color: 'var(--slate-400)', marginTop: 4, fontSize: 14 }}>Live and recent rooms.</p>
      </div>

      {/* Live session — featured panel */}
      <div style={{
        background: 'var(--slate-900)', borderRadius: 24, padding: 28, color: '#fff',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28
      }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(16, 185, 129, 0.15)', color: '#34D399',
            padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, marginBottom: 16
          }}>
            <span style={{ width: 8, height: 8, background: '#34D399', borderRadius: 9999, animation: 'eg-pulse 2s ease-in-out infinite' }}/>
            LIVE
          </div>
          <div style={{ fontSize: 12, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Join code</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 56, letterSpacing: '0.06em', color: '#a78bfa', margin: '4px 0 12px' }}>
            M3K9P2
          </div>
          <div style={{ color: 'var(--slate-300)', fontSize: 14 }}>edugine.app/play/M3K9P2</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 12 }}>In room (3 / 4)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { n: 'Alex',  c: 'var(--violet-500)' },
              { n: 'Mira',  c: 'var(--emerald-500)' },
              { n: 'Jules', c: 'var(--amber-500)' },
            ].map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)',
                borderRadius: 12, padding: '8px 12px'
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 9999, background: p.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                  {p.n[0]}
                </div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.n}</span>
                <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: 9999, background: '#34D399' }}/>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button style={{
              flex: 1, padding: '12px', background: 'var(--violet-600)', color: '#fff',
              fontWeight: 700, borderRadius: 12, border: 0, cursor: 'pointer', fontSize: 14,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}><Play width={14} height={14}/> Start activity</button>
            <button style={{
              padding: '12px 16px', background: 'transparent', color: '#fff',
              fontWeight: 600, borderRadius: 12, border: '1px solid var(--slate-700)', cursor: 'pointer', fontSize: 14
            }}>End</button>
          </div>
        </div>
      </div>

      {/* Recent */}
      <div style={{ fontSize: 12, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 12 }}>Recent</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { code: 'X7H2NQ', set: 'Phrasal verbs · daily routines', n: 4, ago: '1h ago' },
          { code: 'B4J8YR', set: 'Strong opinions debate prompts', n: 2, ago: 'yesterday' },
          { code: 'K2M9PW', set: 'Cooking vocabulary',             n: 3, ago: '3d ago' },
        ].map(s => (
          <div key={s.code} style={{
            background: '#fff', border: '1px solid var(--slate-100)', borderRadius: 14,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--violet-600)', background: 'var(--violet-50)', padding: '4px 10px', borderRadius: 8 }}>{s.code}</span>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--slate-800)' }}>{s.set}</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--slate-400)' }}>
              <Users width={14} height={14}/> {s.n}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--slate-400)' }}>
              <Clock width={14} height={14}/> {s.ago}
            </span>
          </div>
        ))}
      </div>
      <style>{`@keyframes eg-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

window.TutorSessionsScreen = SessionsScreen;
