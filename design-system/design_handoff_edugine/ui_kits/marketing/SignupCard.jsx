// Signup card — based on Edugine's auth gradient surface and the login layout.
function SignupCard({ onBack, onGoLogin, onSignUp }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--violet-500), var(--purple-600), var(--indigo-700))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ width: '100%', maxWidth: 416 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>Edugine</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#fff', margin: 0 }}>
            Start teaching ✨
          </h1>
          <p style={{ color: 'var(--violet-200)', marginTop: 4, fontSize: 14 }}>
            Free for tutors during beta
          </p>
        </div>

        <div style={{
          background: '#fff', borderRadius: 24,
          boxShadow: '0 24px 56px -12px rgba(76, 29, 149, 0.30)', padding: 32
        }}>
          <form onSubmit={e => { e.preventDefault(); onSignUp(); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Your name', value: name, set: setName, type: 'text', ph: 'Alex Carter' },
              { label: 'Email address', value: email, set: setEmail, type: 'email', ph: 'teacher@school.com' },
              { label: 'Password', value: password, set: setPassword, type: 'password', ph: 'at least 8 characters' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--slate-700)', marginBottom: 6 }}>
                  {f.label}
                </label>
                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12,
                    border: '1px solid var(--slate-200)', fontFamily: 'inherit', fontSize: 14,
                    color: 'var(--slate-800)', outline: 'none', boxSizing: 'border-box' }}/>
              </div>
            ))}
            <button type="submit" style={{
              width: '100%', padding: '14px 24px', background: 'var(--violet-600)', color: '#fff',
              fontWeight: 700, borderRadius: 12, border: 0, cursor: 'pointer', fontSize: 14,
              boxShadow: '0 10px 30px -8px rgba(76, 29, 149, 0.20)'
            }}>Create account →</button>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', textAlign: 'center', margin: 0 }}>
              By signing up, you agree to the Terms &amp; Privacy.
            </p>
          </form>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--slate-500)', marginTop: 24 }}>
            Already have an account?{' '}
            <a onClick={onGoLogin} style={{ color: 'var(--violet-600)', fontWeight: 600, cursor: 'pointer' }}>
              Sign in →
            </a>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a onClick={onBack} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>
            ← back to home
          </a>
        </div>
      </div>
    </main>
  );
}

window.MktSignupCard = SignupCard;
