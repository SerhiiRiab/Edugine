export interface VoteState {
  mechanic: 'true_false' | 'multiple_choice'
  currentQuestionIndex: number
  // participantId → option index (MC) or boolean (T/F)
  votes: Record<string, number | boolean>
  revealed: boolean
  status: 'active' | 'finished'
  totalQuestions: number
  // participantId → correct-vote count so far. `votes` is wiped on every question
  // advance, so this is the only record of a participant's running score once the
  // activity ends — incremented once per question, at reveal time.
  correctCounts: Record<string, number>
}
