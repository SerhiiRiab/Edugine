export interface VoteState {
  mechanic: 'true_false' | 'multiple_choice'
  currentQuestionIndex: number
  // participantId → option index (MC) or boolean (T/F)
  votes: Record<string, number | boolean>
  revealed: boolean
  status: 'active' | 'finished'
  totalQuestions: number
}
