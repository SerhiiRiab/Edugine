// Reference: to add this mechanic to the content_sets mechanic_id column, run:
// INSERT into content_sets (owner_id, title, mechanic_id, language) VALUES (..., 'speaking_challenge', 'en');

import type React from 'react'
import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { SpeakingChallengeConfig, SpeakingChallengeItem, SpeakingChallengeState } from './types'

function validateSpeakingChallengeItem(data: unknown): data is SpeakingChallengeItem {
  if (typeof data !== 'object' || data === null) return false
  return typeof (data as Record<string, unknown>).word === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HostStub: React.ComponentType<any> = () => null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PlayerStub: React.ComponentType<any> = () => null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditorStub: React.ComponentType<any> = () => null

export const speakingChallengeDefinition: MechanicDefinition<SpeakingChallengeConfig, SpeakingChallengeItem, SpeakingChallengeState> = {
  id: 'speaking_challenge',
  name: 'Speaking Challenge',
  description: 'Random words appear on screen — students improvise sentences while the clock ticks.',
  skill_category: 'discussion-speaking',
  skill_categories: ['discussion-speaking'],

  HostComponent: HostStub,
  PlayerComponent: PlayerStub,
  ContentEditor: EditorStub,

  defaultConfig: {},
  validateItem: validateSpeakingChallengeItem,

  bulkImport: {
    enabled: true,
    fields: [{ key: 'word', label: 'Word', required: true }],
    placeholder: 'adventure\ntravel\nnature\ncity\nfamily',
    description: 'One word per line',
    defaultSeparator: 'comma',
    parseLine: (line) => {
      const word = line.trim()
      return word ? { word } : null
    },
  },
}
