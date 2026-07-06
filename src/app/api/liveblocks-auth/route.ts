import { Liveblocks } from '@liveblocks/node'
import { createClient } from '@/lib/supabase/server'

// Server-side only — never expose LIVEBLOCKS_SECRET_KEY to the client.
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })

// Only the Lesson Board mechanic uses Liveblocks — the session id is
// recovered from the room id Liveblocks itself passes in, rather than
// trusting a separate client-supplied field that could disagree with it.
// Room format is `lesson-board:${sessionId}:${activityIndex}` (see
// lessonBoardRoomId in src/lib/mechanics/lesson-board/types.ts) — sessionId
// is a UUID and can't contain a colon, so the *last* colon unambiguously
// separates it from the trailing activity index.
const ROOM_PREFIX = 'lesson-board:'

function sessionIdFromRoom(room: string): string | null {
  if (!room.startsWith(ROOM_PREFIX)) return null
  const rest = room.slice(ROOM_PREFIX.length)
  const lastColon = rest.lastIndexOf(':')
  if (lastColon === -1) return null
  return rest.slice(0, lastColon)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    room?: string
    participantId?: string
  } | null

  const room = body?.room
  const sessionId = room ? sessionIdFromRoom(room) : null
  if (!room || !sessionId) {
    return new Response('Invalid room', { status: 400 })
  }
  const supabase = await createClient()

  // Tutor: must own the session — gets full read/write access to draw.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: hostedSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('host_id', user.id)
      .maybeSingle()
    if (hostedSession) {
      const session = liveblocks.prepareSession(`tutor:${user.id}`, {
        userInfo: { name: 'Tutor', role: 'tutor' },
      })
      session.allow(room, ['room:write'])
      const { status, body: authBody } = await session.authorize()
      return new Response(authBody, { status })
    }
  }

  // Student: must be a participant already recorded on this session — gets
  // read-only access, matching the mechanic (host draws, students watch).
  // Presence write is still needed so late joiners' laser-pointer viewer
  // state stays in sync, though only the tutor ever actually sets it.
  if (body?.participantId) {
    const { data: participant } = await supabase
      .from('session_participants')
      .select('id, nickname')
      .eq('id', body.participantId)
      .eq('session_id', sessionId)
      .maybeSingle()
    if (participant) {
      const session = liveblocks.prepareSession(`participant:${participant.id}`, {
        userInfo: { name: participant.nickname ?? 'Student', role: 'student' },
      })
      session.allow(room, ['room:read', 'room:presence:write'])
      const { status, body: authBody } = await session.authorize()
      return new Response(authBody, { status })
    }
  }

  return new Response('Unauthorized', { status: 403 })
}
