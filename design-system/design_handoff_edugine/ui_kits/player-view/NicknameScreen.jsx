// Player nickname / join screen — recreates the "nickname" phase of player-view.tsx
function NicknameScreen({ code = 'M3K9P2', onJoin }) {
  const [nickname, setNickname] = React.useState('');
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 36 }}>📚</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Intermediate · ordering food</h1>
          <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: 0 }}>3 activities</p>
          <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: 0 }}>
            Code: <span style={{ fontFamily: 'var(--font-mono)', color: '#a78bfa', fontWeight: 700 }}>{code}</span>
          </p>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (nickname.trim()) onJoin(nickname.trim()); }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, color: 'var(--slate-300)' }}>Your name</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. Alex" autoFocus
              maxLength={30}
              style={{
                background: 'var(--slate-800)', border: '1px solid var(--slate-700)', borderRadius: 12,
                padding: '14px 16px', color: '#fff', fontSize: 18, fontFamily: 'inherit', outline: 0,
                boxSizing: 'border-box', width: '100%'
              }}/>
          </div>
          <button type="submit" disabled={!nickname.trim()} style={{
            background: 'var(--violet-600)', color: '#fff', fontWeight: 700, fontSize: 16,
            padding: '14px', borderRadius: 12, border: 0,
            opacity: nickname.trim() ? 1 : 0.5,
            cursor: nickname.trim() ? 'pointer' : 'not-allowed'
          }}>Join →</button>
        </form>
      </div>
    </div>
  );
}

window.PlayerNicknameScreen = NicknameScreen;
