'use server'

/**
 * Returns the current server timestamp as an ISO string.
 * Use this instead of new Date().toISOString() in the browser when setting
 * timerStartedAt, so all clients compute elapsed time from a neutral reference
 * rather than the host's local clock.
 */
export async function getServerTimestamp(): Promise<string> {
  return new Date().toISOString()
}
