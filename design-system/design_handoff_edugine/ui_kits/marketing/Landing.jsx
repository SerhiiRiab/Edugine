// Marketing landing page — recreates src/app/page.tsx
const { ArrowRight, Sparkles, Rocket } = window.EdugineIcons;

function Landing({ onGoLogin, onGoSignup }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--violet-500), var(--purple-600), var(--indigo-700))',
      fontFamily: 'var(--font-sans)', color: '#fff'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', maxWidth: 1152, margin: '0 auto'
      }}>
        {/* On the violet gradient, drop the E mark — wordmark only, in white. */}
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.025em', color: '#fff' }}>Edugine</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onGoLogin} style={{
            padding: '8px 16px', background: 'transparent', border: 0, cursor: 'pointer',
            color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: 14
          }}>Sign in</button>
          <button onClick={onGoSignup} style={{
            padding: '8px 20px', background: '#fff', color: 'var(--violet-700)',
            fontWeight: 600, fontSize: 14, borderRadius: 12, border: 0, cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(15,23,42,0.04)'
          }}>Sign up</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '112px 24px', maxWidth: 896, margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.20)',
          borderRadius: 9999, padding: '6px 16px',
          color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: 500, marginBottom: 32
        }}>
          <span style={{ width: 8, height: 8, background: '#4ADE80', borderRadius: 9999,
            animation: 'eg-pulse 2s ease-in-out infinite' }}/>
          Now in beta — free for tutors
        </div>
        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: 800,
          letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 24px'
        }}>
          The lesson engine<br/>that goes brrrr 🚀
        </h1>
        <p style={{
          color: 'var(--violet-200)', fontSize: 'clamp(18px, 2vw, 20px)',
          lineHeight: 1.6, margin: '0 0 40px', maxWidth: 580
        }}>
          Create interactive lessons, manage students, and track progress —
          all in one place built for tutors.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onGoSignup} style={{
            padding: '16px 32px', background: '#fff', color: 'var(--violet-700)',
            fontWeight: 700, fontSize: 18, borderRadius: 16, border: 0, cursor: 'pointer',
            boxShadow: '0 20px 50px -10px rgba(76, 29, 149, 0.40)',
            display: 'inline-flex', alignItems: 'center', gap: 8
          }}>Get started for free ✨</button>
          <button onClick={onGoLogin} style={{
            padding: '16px 32px', background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(8px)', color: '#fff', fontWeight: 700, fontSize: 18,
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.20)', cursor: 'pointer'
          }}>Sign in</button>
        </div>
      </section>

      {/* "What's inside" rail — supportive marketing block */}
      <section style={{ maxWidth: 1024, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16
        }}>
          {[
            { emoji: '🎯', title: 'Swipe Battles', body: 'Vocab cards your students actually want to drill.' },
            { emoji: '📖', title: 'Group Stories', body: '1–4 students co-author live, in the same room.' },
            { emoji: '⚡', title: 'Speed Match', body: 'Race-the-clock pair matching — chaos, but learning.' },
          ].map(c => (
            <div key={c.title} style={{
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: 20
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{c.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 14, color: 'var(--violet-200)', lineHeight: 1.5 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      <style>{`@keyframes eg-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </main>
  );
}

window.MktLanding = Landing;
