// Shared between the server actions that enforce "one Lesson Board per
// lesson" and the client components that display the resulting error, so
// the UI can tell this expected constraint apart from a genuine failure and
// style its toast as a mild heads-up rather than an alarming red error.
export const DUPLICATE_LESSON_BOARD_MESSAGE = 'This lesson already has a Lesson Board activity — only one is allowed per lesson.'
