// Result screen — recreates the "finished" phase of player-view.tsx
function ResultScreen({ result, onReset }) {
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 0;
  const trophy = accuracy >= 80 ? '🏆' : accuracy >= 50 ? '🎉' : '💪';

  const missed = [
    { word: 'turn down', translation: 'to refuse or reject something' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 48 }}>{trophy}</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>
            {result.correct}/{result.total} correct!
          </h2>
          <p style={{ color: 'var(--slate-400)', margin: 0 }}>
            You scored <span style={{ color: '#a78bfa', fontWeight: 700 }}>{result.score} points</span>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16, 185, 129, 0.20)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--emerald-400)' }}>{result.correct}</div>
            <div style={{ fontSize: 11, color: 'var(--emerald-500)', marginTop: 4 }}>Correct</div>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.10)', border: '1px solid rgba(239, 68, 68, 0.20)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#f87171' }}>{result.total - result.correct}</div>
            <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Wrong</div>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.10)', border: '1px solid rgba(139, 92, 246, 0.20)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#a78bfa' }}>{accuracy}%</div>
            <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 4 }}>Accuracy</div>
          </div>
        </div>

        {missed.length > 0 && (
          <div style={{ background: 'var(--slate-800)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              Review these ({missed.length})
            </p>
            {missed.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ color: '#f87171' }}>✗</span>
                <span style={{ color: '#fff' }}>{m.word}</span>
                <span style={{ color: 'var(--slate-500)' }}>→</span>
                <span style={{ color: 'var(--slate-300)' }}>{m.translation}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onReset} style={{
          background: 'transparent', color: 'var(--slate-500)', border: '1px dashed var(--slate-700)',
          borderRadius: 12, padding: 10, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer'
        }}>play again (demo) ↺</button>
      </div>
    </div>
  );
}

window.PlayerResultScreen = ResultScreen;
