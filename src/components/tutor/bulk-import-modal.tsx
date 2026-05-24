'use client'

import { useState, useMemo } from 'react'
import { X, AlertTriangle, Check, ClipboardList } from 'lucide-react'
import {
  parseBulkText,
  SEPARATOR_OPTIONS,
  type BulkSeparator,
} from '@/lib/utils/bulk-import-parser'
import type { BulkImportConfig } from '@/lib/mechanics/types'

const PREVIEW_MAX = 5
const WARN_THRESHOLD = 200

interface Props {
  config: BulkImportConfig
  onImport: (items: Record<string, unknown>[]) => Promise<void>
  onClose: () => void
}

export function BulkImportModal({ config, onImport, onClose }: Props) {
  const [text, setText] = useState('')
  const [separator, setSeparator] = useState<BulkSeparator>(config.defaultSeparator)
  const [toggleValue, setToggleValue] = useState(config.correctToggle?.default ?? true)
  const [isImporting, setIsImporting] = useState(false)

  const multiField = config.fields.length > 1

  const result = useMemo(
    () => parseBulkText(text, config.parseLine, separator),
    [text, separator, config.parseLine],
  )

  async function handleImport() {
    if (!result.items.length || isImporting) return
    setIsImporting(true)
    try {
      const items = result.items.map(item => ({
        ...config.itemDefaults,
        ...item,
        ...(config.correctToggle ? { [config.correctToggle.field]: toggleValue } : {}),
      }))
      await onImport(items)
    } finally {
      setIsImporting(false)
    }
  }

  const preview = result.items.slice(0, PREVIEW_MAX)
  const hasContent = text.trim().length > 0
  const [firstField, secondField] = config.fields

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="flex items-center gap-1.5 text-lg font-bold text-slate-800"><ClipboardList className="w-5 h-5 text-slate-500" />Bulk Add</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Description */}
          <p className="text-sm text-slate-500">{config.description}</p>

          {/* Separator selector — only for multi-field mechanics */}
          {multiField && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Separator
              </label>
              <div className="flex gap-2 flex-wrap">
                {SEPARATOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeparator(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      separator === opt.value
                        ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {separator === 'tab' && (
                <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                  ✓ Copy directly from Excel or Google Sheets
                </p>
              )}
            </div>
          )}

          {/* Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {multiField ? 'Paste your entries (one per line)' : 'Paste your items (one per line)'}
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={8}
              autoFocus
              spellCheck={false}
              placeholder={config.placeholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3
                text-sm font-mono text-slate-800 placeholder:text-slate-300 resize-none
                outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100
                transition-colors leading-relaxed"
            />
          </div>

          {/* Live preview */}
          {hasContent && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Preview
                </p>
                <span className={`text-xs font-bold tabular-nums ${
                  result.items.length > 0 ? 'text-violet-600' : 'text-slate-400'
                }`}>
                  Will create {result.items.length} item{result.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {preview.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {multiField && secondField ? (
                    <>
                      <span className="text-slate-700 font-medium truncate max-w-[45%]">
                        {String(item[firstField.key] ?? '(empty)')}
                      </span>
                      <span className="text-slate-400 shrink-0">→</span>
                      <span className="text-slate-600 truncate max-w-[45%]">
                        {String(item[secondField.key] ?? '(empty)')}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-700 font-medium truncate">
                      {String(item[firstField.key] ?? '(empty)')}
                    </span>
                  )}
                </div>
              ))}

              {result.items.length > PREVIEW_MAX && (
                <p className="text-xs text-slate-400 pl-5">
                  … and {result.items.length - PREVIEW_MAX} more
                </p>
              )}

              {result.partial > 0 && (
                <div className="flex items-start gap-1.5 pt-1 border-t border-slate-200 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600">
                    {result.partial} line{result.partial !== 1 ? 's' : ''} skipped — could not be parsed
                  </p>
                </div>
              )}

              {result.items.length > WARN_THRESHOLD && (
                <div className="flex items-start gap-1.5 pt-1 border-t border-slate-200 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600">
                    Large import ({result.items.length} items) — this may take a moment
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Correct toggle — only when mechanic declares one */}
          {config.correctToggle && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setToggleValue(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ${
                  toggleValue ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  toggleValue ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className="text-sm text-slate-700">
                {config.correctToggle.label}
                {config.correctToggle.hint && (
                  <span className="text-slate-400 ml-1">({config.correctToggle.hint})</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600
              text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleImport}
            disabled={result.items.length === 0 || isImporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600
              hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed
              text-white text-sm font-bold transition-colors shadow-sm"
          >
            {isImporting ? (
              'Adding...'
            ) : result.items.length > 0 ? (
              `Add ${result.items.length} item${result.items.length !== 1 ? 's' : ''} →`
            ) : (
              'Paste some items first'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
