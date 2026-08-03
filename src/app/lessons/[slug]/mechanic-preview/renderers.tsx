import { Check, X, Video, PenTool } from 'lucide-react'
import type { MechanicId } from '@/lib/mechanics/types'
import { ScenarioBlock, NumberedList, EmptyNote, TrueFalseTag, type RendererProps } from './atoms'

import type { SwipeBattleItem } from '@/lib/mechanics/swipe-battle/types'
import type { TalkTimeItem } from '@/lib/mechanics/talk-time/types'
import type { MissionBriefingItem } from '@/lib/mechanics/mission-briefing/types'
import type { DebateRouletteItem } from '@/lib/mechanics/debate-roulette/types'
import type { SpeedDebateItem } from '@/lib/mechanics/speed-debate/types'
import type { JigsawReadingItem } from '@/lib/mechanics/jigsaw-reading/types'
import { EVENT_CONFIG, type DramaEventItem } from '@/lib/mechanics/drama-event/types'
import type { HiddenRoleItem } from '@/lib/mechanics/hidden-role/types'
import type { RoleplayQuestItem } from '@/lib/mechanics/roleplay-quest/types'
import type { WordChoiceItem } from '@/lib/mechanics/word-choice/types'
import type { TrueFalseItem } from '@/lib/mechanics/true-false/types'
import type { FillTheGapItem } from '@/lib/mechanics/fill-the-gap/types'
import type { CorrectTheMistakeItem } from '@/lib/mechanics/correct-the-mistake/types'
import type { MultipleChoiceItem } from '@/lib/mechanics/multiple-choice/types'
import type { ContentBlockItem } from '@/lib/mechanics/content-block/types'
import type { ElevatorPitchItem } from '@/lib/mechanics/elevator-pitch/types'
import type { TabooItem } from '@/lib/mechanics/taboo/types'
import type { SpeedMatchItem } from '@/lib/mechanics/speed-match/types'
import type { StoryBuilderItem } from '@/lib/mechanics/story-builder/types'
import type { SpeakingChallengeItem } from '@/lib/mechanics/speaking-challenge/types'
import { parsePredictVerifyDescription, type PredictVerifyItem } from '@/lib/mechanics/predict-verify/types'
import type { WordBankItem } from '@/lib/mechanics/word-bank/types'

type RendererFn = (props: RendererProps) => React.ReactElement

function SwipeBattle({ items }: RendererProps) {
  const cards = items.map(i => i.data as unknown as SwipeBattleItem)
  if (!cards.length) return <EmptyNote />
  return (
    <ul className="space-y-2">
      {cards.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
          {it.isCorrect
            ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            : <X className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <p className="font-medium text-slate-800 text-sm">{it.word}</p>
            {it.translation && <p className="text-xs text-slate-400">{it.translation}</p>}
            {it.explanation && <p className="text-xs text-slate-400 mt-1 italic">{it.explanation}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function TalkTime({ items }: RendererProps) {
  const prompts = items.map(i => (i.data as unknown as TalkTimeItem).prompt)
  if (!prompts.length) return <EmptyNote />
  return <NumberedList items={prompts} />
}

function MissionBriefing({ description, items }: RendererProps) {
  const roles = items.map(i => i.data as unknown as MissionBriefingItem)
  return (
    <div>
      <ScenarioBlock text={description} />
      {roles.length === 0 ? <EmptyNote /> : (
        <ul className="space-y-2">
          {roles.map((r, i) => (
            <li key={i} className="p-3 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800 text-sm mb-1">{r.playerLabel}</p>
              <p className="text-sm text-slate-600 whitespace-pre-line">{r.briefing}</p>
              {r.languageConstraints && r.languageConstraints.length > 0 && (
                <p className="text-xs text-slate-400 mt-1.5">Must use: {r.languageConstraints.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DebateRoulette({ description, items }: RendererProps) {
  const topics = items.map(i => (i.data as unknown as DebateRouletteItem).topic)
  const phrases = (description ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      <NumberedList label="Useful phrases" items={phrases} />
      {topics.length === 0 ? <EmptyNote /> : <NumberedList items={topics} />}
    </div>
  )
}

function SpeedDebate({ description, items }: RendererProps) {
  const statements = items.map(i => i.data as unknown as SpeedDebateItem)
  const phrases = (description ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      <NumberedList label="Useful phrases" items={phrases} />
      {statements.length === 0 ? <EmptyNote /> : (
        <ol className="space-y-2 list-decimal list-inside text-sm text-slate-700">
          {statements.map((s, i) => (
            <li key={i}>
              {s.statement}
              {s.usefulPhrases && s.usefulPhrases.length > 0 && (
                <span className="block text-xs text-slate-400 ml-5">{s.usefulPhrases.join(', ')}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function JigsawReading({ description, items }: RendererProps) {
  const fragments = items.map(i => i.data as unknown as JigsawReadingItem)
  const questions = (description ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      {fragments.length === 0 ? <EmptyNote /> : fragments.map((f, i) => (
        <div key={i} className="p-3 rounded-lg border border-slate-100">
          <p className="font-semibold text-slate-800 text-sm mb-1">{f.title}</p>
          <p className="text-sm text-slate-600 whitespace-pre-line">{f.text}</p>
        </div>
      ))}
      <NumberedList label="Comprehension questions" items={questions} />
    </div>
  )
}

function DramaEvent({ description, items }: RendererProps) {
  const cards = items.map(i => i.data as unknown as DramaEventItem)
  return (
    <div>
      <ScenarioBlock text={description} />
      {cards.length === 0 ? <EmptyNote /> : (
        <ul className="space-y-2">
          {cards.map((c, i) => {
            const meta = EVENT_CONFIG[c.eventType]
            return (
              <li key={i} className="p-3 rounded-lg border border-slate-100 flex items-start gap-2.5">
                <span className="text-lg leading-none shrink-0">{meta?.emoji ?? '🎲'}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta?.color }}>
                    {meta?.label ?? c.eventType}
                  </p>
                  <p className="text-sm text-slate-700">{c.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function HiddenRole({ description, items }: RendererProps) {
  const roles = items.map(i => i.data as unknown as HiddenRoleItem)
  return (
    <div>
      <ScenarioBlock text={description} />
      {roles.length === 0 ? <EmptyNote /> : (
        <ul className="space-y-2">
          {roles.map((r, i) => (
            <li key={i} className="p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-slate-800 text-sm">{r.roleName}</p>
                {r.isSpy && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-600">Spy</span>}
              </div>
              <p className="text-sm text-slate-600">{r.roleDescription}</p>
              <p className="text-xs text-slate-500 mt-1.5"><span className="font-semibold">Secret goal:</span> {r.secretGoal}</p>
              {r.languageConstraints?.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">Must use: {r.languageConstraints.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RoleplayQuest({ description, items }: RendererProps) {
  const roles = items.map(i => i.data as unknown as RoleplayQuestItem)
  return (
    <div>
      <ScenarioBlock text={description} />
      {roles.length === 0 ? <EmptyNote /> : (
        <ul className="space-y-2">
          {roles.map((r, i) => (
            <li key={i} className="p-3 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800 text-sm mb-1">{r.roleName}</p>
              <p className="text-sm text-slate-600">{r.roleDescription}</p>
              <p className="text-xs text-slate-500 mt-1.5"><span className="font-semibold">Secret goal:</span> {r.secretGoal}</p>
              {r.usefulPhrases && r.usefulPhrases.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">Useful phrases: {r.usefulPhrases.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WordChoice({ items }: RendererProps) {
  const sentences = items.map(i => i.data as unknown as WordChoiceItem)
  if (!sentences.length) return <EmptyNote />
  return (
    <ul className="space-y-3">
      {sentences.map((s, si) => {
        const parts = s.sentence.split('___')
        return (
          <li key={si} className="text-sm text-slate-700 leading-relaxed">
            {parts.map((part, pi) => (
              <span key={pi}>
                {part}
                {pi < parts.length - 1 && s.blanks[pi] && (
                  <span className="mx-1">
                    {s.blanks[pi].options.map((opt, oi) => (
                      <span
                        key={oi}
                        className={`mr-1.5 ${oi === s.blanks[pi].correctIndex
                          ? 'underline decoration-emerald-500 decoration-2 font-semibold text-emerald-700'
                          : 'text-slate-400'}`}
                      >
                        {opt}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            ))}
          </li>
        )
      })}
    </ul>
  )
}

function TrueFalse({ items }: RendererProps) {
  const rows = items.map(i => i.data as unknown as TrueFalseItem)
  if (!rows.length) return <EmptyNote />
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100">
          <span className="text-sm text-slate-700">{r.statement}</span>
          <TrueFalseTag value={r.isTrue} />
        </li>
      ))}
    </ul>
  )
}

function FillTheGap({ items }: RendererProps) {
  const rows = items.map(i => i.data as unknown as FillTheGapItem)
  if (!rows.length) return <EmptyNote />
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => {
        const parts = r.sentence.split('___')
        return (
          <li key={i} className="text-sm text-slate-700 leading-relaxed">
            {parts.map((part, pi) => (
              <span key={pi}>
                {part}
                {pi < parts.length - 1 && r.blanks[pi] && (
                  <span className="mx-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                    {r.blanks[pi].answer}
                  </span>
                )}
              </span>
            ))}
          </li>
        )
      })}
    </ul>
  )
}

function CorrectTheMistake({ items }: RendererProps) {
  const rows = items.map(i => i.data as unknown as CorrectTheMistakeItem)
  if (!rows.length) return <EmptyNote />
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className="p-2.5 rounded-lg border border-slate-100 text-sm">
          <p className="text-rose-500 line-through decoration-rose-300">{r.incorrect}</p>
          <p className="text-emerald-700 font-medium mt-0.5">{r.correct}</p>
        </li>
      ))}
    </ul>
  )
}

function MultipleChoice({ items }: RendererProps) {
  const rows = items.map(i => i.data as unknown as MultipleChoiceItem)
  if (!rows.length) return <EmptyNote />
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={i}>
          <p className="text-sm font-medium text-slate-800 mb-1.5">{r.question}</p>
          <ul className="space-y-1">
            {r.options.map((opt, oi) => (
              <li
                key={oi}
                className={`text-sm px-2.5 py-1 rounded-lg border ${
                  oi === r.correctIndex
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold'
                    : 'border-slate-100 text-slate-600'}`}
              >
                {opt}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

function ContentBlock({ items }: RendererProps) {
  const c = items[0]?.data as unknown as ContentBlockItem | undefined
  if (!c) return <EmptyNote />
  return (
    <div className="space-y-3">
      {c.text && <p className="text-sm text-slate-700 whitespace-pre-line">{c.text}</p>}
      {c.type === 'video' && c.videoUrl && (
        <a
          href={c.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline"
        >
          <Video className="w-4 h-4" /> Watch video
        </a>
      )}
      {c.type === 'grammar_table' && c.grammarTable?.rows?.length > 0 && (
        <div className="overflow-x-auto">
          {c.grammarTable.whenToUse && <p className="text-xs text-slate-400 mb-1.5">{c.grammarTable.whenToUse}</p>}
          <table className="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
            <tbody>
              {c.grammarTable.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-1.5 font-medium text-slate-800">{row.form}</td>
                  <td className="px-3 py-1.5 text-slate-600">{row.example}</td>
                  <td className="px-3 py-1.5 text-slate-400 text-xs">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {c.type === 'vocab_cards' && c.vocabCards?.cards?.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-2">
          {c.vocabCards.cards.map((v, i) => (
            <li key={i} className="p-2.5 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800 text-sm">
                {v.word} <span className="text-xs text-slate-400 font-normal">{v.pos}</span>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{v.definition}</p>
              {v.example && <p className="text-xs text-slate-400 italic mt-0.5">{v.example}</p>}
            </li>
          ))}
        </ul>
      )}
      <NumberedList label="Discussion questions" items={c.discussionQuestions ?? []} />
      {c.trueFalseCards?.length > 0 && (
        <ul className="space-y-1.5">
          {c.trueFalseCards.map((tf, i) => (
            <li key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-slate-100 text-sm">
              <span className="text-slate-700">{tf.statement}</span>
              <TrueFalseTag value={tf.isTrue} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ElevatorPitch({ description, items }: RendererProps) {
  const topics = items.map(i => i.data as unknown as ElevatorPitchItem)
  const phrases = (description ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      <NumberedList label="Useful phrases" items={phrases} />
      {topics.length === 0 ? <EmptyNote /> : (
        <ul className="space-y-2">
          {topics.map((t, i) => (
            <li key={i} className="p-2.5 rounded-lg border border-slate-100 text-sm">
              <p className="text-slate-800 font-medium">{t.topic}</p>
              {t.context && <p className="text-xs text-slate-400 mt-0.5">{t.context}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Taboo({ items }: RendererProps) {
  const cards = items.map(i => i.data as unknown as TabooItem)
  if (!cards.length) return <EmptyNote />
  return (
    <ul className="grid sm:grid-cols-2 gap-2">
      {cards.map((c, i) => (
        <li key={i} className="p-3 rounded-lg border border-slate-100">
          <p className="font-bold text-slate-800 text-sm mb-1.5">{c.word}</p>
          <ul className="space-y-0.5">
            {c.forbiddenWords.map((w, wi) => <li key={wi} className="text-xs text-rose-500">{w}</li>)}
          </ul>
        </li>
      ))}
    </ul>
  )
}

function SpeedMatch({ items }: RendererProps) {
  const pairs = items.map(i => i.data as unknown as SpeedMatchItem)
  if (!pairs.length) return <EmptyNote />
  return (
    <ul className="grid sm:grid-cols-2 gap-2">
      {pairs.map((p, i) => (
        <li key={i} className="p-2.5 rounded-lg border border-slate-100 text-sm flex items-center justify-between gap-2">
          <span className="font-medium text-slate-800">{p.front}</span>
          <span className="text-slate-400">→</span>
          <span className="text-slate-600">{p.back}</span>
        </li>
      ))}
    </ul>
  )
}

function StoryBuilder({ description, items }: RendererProps) {
  const words = items.map(i => (i.data as unknown as StoryBuilderItem).word)
  return (
    <div>
      {description?.trim() && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Story prompt</p>
          <p className="text-sm text-slate-700 whitespace-pre-line">{description}</p>
        </div>
      )}
      {words.length === 0 ? <EmptyNote /> : (
        <div className="flex flex-wrap gap-1.5">
          {words.map((w, i) => (
            <span key={i} className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">{w}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function SpeakingChallenge({ description, items }: RendererProps) {
  const words = items.map(i => (i.data as unknown as SpeakingChallengeItem).word)
  return (
    <div>
      {description?.trim() && <p className="text-sm text-slate-500 mb-2">{description}</p>}
      {words.length === 0 ? <EmptyNote /> : (
        <div className="flex flex-wrap gap-1.5">
          {words.map((w, i) => (
            <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">{w}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function PredictVerify({ description, items }: RendererProps) {
  const { questions } = parsePredictVerifyDescription(description ?? '')
  const articles = items.map(i => i.data as unknown as PredictVerifyItem)
  const questionList = questions.split('\n').map(s => s.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      <NumberedList label="Prediction questions" items={questionList} />
      {articles.length === 0 ? <EmptyNote /> : (
        <ul className="space-y-2">
          {articles.map((a, i) => (
            <li key={i} className="p-2.5 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800 text-sm">{a.headline}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-3">{a.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WordBank({ items }: RendererProps) {
  const rows = items.map(i => i.data as unknown as WordBankItem)
  if (!rows.length) return <EmptyNote />
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={i}>
          <p className="text-sm text-slate-700 whitespace-pre-line mb-1.5">{r.text}</p>
          <div className="flex flex-wrap gap-1.5">
            {r.wordBank.map((w, wi) => (
              <span key={wi} className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-medium">{w}</span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

function LessonBoard() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 italic p-3 rounded-lg bg-slate-50 border border-slate-100">
      <PenTool className="w-4 h-4 shrink-0" />
      Interactive whiteboard — available during live session
    </div>
  )
}

export const RENDERERS: Partial<Record<MechanicId, RendererFn>> = {
  swipe_battle: SwipeBattle,
  talk_time: TalkTime,
  mission_briefing: MissionBriefing,
  debate_roulette: DebateRoulette,
  speed_debate: SpeedDebate,
  jigsaw_reading: JigsawReading,
  drama_event: DramaEvent,
  hidden_role: HiddenRole,
  roleplay_quest: RoleplayQuest,
  word_choice: WordChoice,
  true_false: TrueFalse,
  fill_the_gap: FillTheGap,
  correct_the_mistake: CorrectTheMistake,
  multiple_choice: MultipleChoice,
  content_block: ContentBlock,
  elevator_pitch: ElevatorPitch,
  taboo: Taboo,
  speed_match: SpeedMatch,
  story_builder: StoryBuilder,
  speaking_challenge: SpeakingChallenge,
  predict_verify: PredictVerify,
  word_bank: WordBank,
  lesson_board: LessonBoard,
}
