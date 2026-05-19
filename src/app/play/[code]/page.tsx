import { createClient } from '@/lib/supabase/server'
import { PlayerView } from '@/components/play/player-view'

interface Props {
  params: Promise<{ code: string }>
}

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/

export default async function PlayPage({ params }: Props) {
  const { code } = await params
  const upperCode = code.toUpperCase()

  if (!CODE_REGEX.test(upperCode)) {
    return <InvalidCodePage code={code} />
  }

  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, mechanic_id, set_id, code')
    .eq('code', upperCode)
    .single()

  if (!session) {
    return <InvalidCodePage code={upperCode} />
  }

  if (session.status === 'finished') {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="text-5xl">🏁</div>
          <h1 className="text-2xl font-bold">Session ended</h1>
          <p className="text-slate-400">This game session has already finished.</p>
        </div>
      </main>
    )
  }

  const { data: items } = await supabase
    .from('content_items')
    .select('id, position, data')
    .eq('set_id', session.set_id)
    .order('position', { ascending: true })

  return (
    <PlayerView
      session={{
        id: session.id,
        code: session.code,
        status: session.status as 'waiting' | 'active',
      }}
      items={(items ?? []).map((i) => ({
        id: i.id,
        word: (i.data as { word?: string }).word ?? '',
        translation: (i.data as { translation?: string }).translation ?? '',
        isCorrect: (i.data as { isCorrect?: boolean }).isCorrect ?? true,
      }))}
    />
  )
}

function InvalidCodePage({ code }: { code: string }) {
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center text-white space-y-3">
        <div className="text-5xl">❌</div>
        <h1 className="text-2xl font-bold">Invalid code</h1>
        <p className="text-slate-400">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{code}</span> is not a valid session code.
        </p>
        <p className="text-slate-500 text-sm">Ask your teacher for the correct code.</p>
      </div>
    </main>
  )
}
