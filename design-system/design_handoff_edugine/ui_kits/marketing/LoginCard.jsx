// Login card — recreates src/app/(auth)/login/page.tsx
const { Eye, EyeOff } = window.EdugineIcons;

function LoginCard({ onBack, onGoSignup, onSignIn }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [magicMode, setMagicMode] = React.useState(false);
  const [magicSent, setMagicSent] = React.useState(false);

  function submit(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignIn(); }, 800);
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--violet-500), var(--purple-600), var(--indigo-700))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ width: '100%', maxWidth: 416 }}>
        {/* On the violet gradient, drop the E mark — wordmark only, in white. */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>
            Edugine
          </h1>
          <p style={{ color: 'var(--violet-200)', marginTop: 4, fontSize: 14 }}>
            The lesson engine that goes brrrr 🚀
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 24,
          boxShadow: '0 24px 56px -12px rgba(76, 29, 149, 0.30)',
          padding: 32
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 4px' }}>
            Welcome back! 👋
          </h2>
          <p style={{ color: 'var(--slate-500)', fontSize: 14, margin: '0 0 24px' }}>Sign in to continue</p>

          {!magicSent ? (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--slate-700)', marginBottom: 6 }}>
                  Email address
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="teacher@school.com"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12,
                    border: '1px solid var(--slate-200)', fontFamily: 'inherit', fontSize: 14,
                    color: 'var(--slate-800)', outline: 'none', boxSizing: 'border-box' }}/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--slate-700)', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12,
                      border: '1px solid var(--slate-200)', fontFamily: 'inherit', fontSize: 14,
                      color: 'var(--slate-800)', outline: 'none', boxSizing: 'border-box' }}/>
                  <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--slate-400)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    {showPassword ? <EyeOff width={20} height={20}/> : <Eye width={20} height={20}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px 24px', background: 'var(--violet-600)', color: '#fff',
                fontWeight: 600, borderRadius: 12, border: 0, cursor: loading ? 'wait' : 'pointer',
                fontSize: 14, opacity: loading ? 0.6 : 1
              }}>
                {loading
                  ? <span style={{display:'inline-flex', gap:8, alignItems:'center'}}>
                      <span style={{width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:9999, animation:'eg-spin 0.7s linear infinite'}}/>
                      Signing in…
                    </span>
                  : 'Sign in →'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <a style={{ fontSize: 14, color: 'var(--violet-500)', cursor: 'pointer' }}>Forgot password?</a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }}/>
                <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }}/>
              </div>

              {!magicMode ? (
                <button type="button" onClick={() => setMagicMode(true)} style={{
                  width: '100%', padding: '12px 24px', background: 'transparent',
                  color: 'var(--violet-600)', border: '2px solid var(--violet-200)',
                  fontWeight: 600, borderRadius: 12, cursor: 'pointer', fontSize: 14
                }}>Send magic link instead ✨</button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setMagicMode(false)} style={{
                    padding: '12px 16px', background: 'transparent', color: 'var(--slate-500)',
                    border: 0, cursor: 'pointer', fontWeight: 500, fontSize: 14
                  }}>Cancel</button>
                  <button type="button" onClick={() => setMagicSent(true)} style={{
                    flex: 1, padding: '12px', background: 'var(--violet-600)', color: '#fff',
                    fontWeight: 600, borderRadius: 12, border: 0, cursor: 'pointer', fontSize: 14
                  }}>Send magic link ✨</button>
                </div>
              )}
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
              <p style={{ color: 'var(--slate-600)', fontSize: 14, margin: 0 }}>
                Magic link sent to <span style={{ fontWeight: 600, color: 'var(--violet-600)' }}>{email || 'you'}</span>
              </p>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--slate-500)', marginTop: 24 }}>
            Don't have an account?{' '}
            <a onClick={onGoSignup} style={{ color: 'var(--violet-600)', fontWeight: 600, cursor: 'pointer' }}>
              Sign up →
            </a>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a onClick={onBack} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>
            ← back to home
          </a>
        </div>
      </div>
      <style>{`@keyframes eg-spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

window.MktLoginCard = LoginCard;
