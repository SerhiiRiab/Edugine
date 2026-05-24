// Dashboard screen — recreates src/app/tutor/dashboard/page.tsx
const { BookOpen, Play, Users, ArrowRight } = window.EdugineIcons;

function StatCard({ icon: Icon, label, value, accentBg, accentFg }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 24,
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--slate-100)',
      transition: 'box-shadow 200ms'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 12,
        background: accentBg, color: accentFg, marginBottom: 16
      }}>
        <Icon width={20} height={20}/>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--slate-800)', marginBottom: 2, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ color: 'var(--slate-400)', fontSize: 14 }}>{label}</div>
    </div>
  );
}

function DashboardScreen({ name = 'teacher', onGoCreate }) {
  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--slate-800)', margin: 0, letterSpacing: '-0.02em' }}>
          Hey, {name}! 👋
        </h1>
        <p style={{ color: 'var(--slate-400)', marginTop: 4 }}>Ready to teach something awesome today?</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
        <StatCard icon={BookOpen} label="Content Sets" value="12" accentBg="var(--violet-100)" accentFg="var(--violet-600)"/>
        <StatCard icon={Play} label="Active Sessions" value="3" accentBg="var(--emerald-100)" accentFg="var(--emerald-600)"/>
        <StatCard icon={Users} label="Total Plays" value="148" accentBg="var(--orange-100)" accentFg="var(--orange-600)"/>
      </div>

      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(90deg, var(--violet-500), var(--purple-600))',
        borderRadius: 24, padding: 32, color: '#fff'
      }}>
        <div style={{
          position: 'absolute', top: -32, right: -32, width: 160, height: 160,
          background: 'rgba(255,255,255,0.10)', borderRadius: 9999
        }}/>
        <div style={{
          position: 'absolute', bottom: -48, right: 96, width: 128, height: 128,
          background: 'rgba(255,255,255,0.10)', borderRadius: 9999
        }}/>
        <div style={{ position: 'relative' }}>
          <p style={{ color: 'var(--violet-200)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Get started</p>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Create your first lesson! 🚀
          </h2>
          <p style={{ color: 'var(--violet-100)', fontSize: 14, marginBottom: 24, maxWidth: 460 }}>
            Build a content set and launch a live Swipe Battle session in minutes.
            Students join with a code — no sign-up needed.
          </p>
          <button onClick={onGoCreate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', color: 'var(--violet-700)',
            fontWeight: 700, padding: '10px 20px', borderRadius: 12, border: 0,
            cursor: 'pointer', fontSize: 14
          }}>
            Create content set
            <ArrowRight width={16} height={16}/>
          </button>
        </div>
      </div>

      {/* Recent activity rail */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 16px' }}>Recent activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { who: 'Phrasal verbs · daily routines', what: 'session ended · 4 students · 78% avg', ago: '23m ago', dot: 'var(--emerald-500)' },
            { who: 'Roleplay quest · ordering food', what: 'duplicated', ago: '2h ago', dot: 'var(--violet-500)' },
            { who: 'B1 vocab pack', what: 'added 6 cards', ago: '1d ago', dot: 'var(--amber-500)' },
          ].map((a, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid var(--slate-100)', borderRadius: 12,
              padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: a.dot, flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--slate-800)' }}>{a.who}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>{a.what}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{a.ago}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.TutorDashboardScreen = DashboardScreen;
