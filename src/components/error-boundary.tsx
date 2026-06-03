'use client'

import React from 'react'
import { RotateCcw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: string
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-red-50 border border-red-100 text-center">
          <div>
            <p className="font-semibold text-slate-700">Something went wrong</p>
            {this.props.fallback && (
              <p className="text-sm text-slate-500 mt-1">{this.props.fallback}</p>
            )}
          </div>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
