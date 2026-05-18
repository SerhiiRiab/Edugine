// TODO: Player entry point — nickname form + live game view

interface Props {
  params: Promise<{ code: string }>
}

export default async function PlayPage({ params }: Props) {
  const { code } = await params
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Session <strong>{code}</strong> — coming soon</p>
    </main>
  )
}
