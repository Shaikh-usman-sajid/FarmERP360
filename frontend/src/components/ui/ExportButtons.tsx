'use client'
import { useState } from 'react'
import { exportCSV, exportExcel, exportPDF, ExportColumn } from '@/lib/exportUtils'

interface Props {
  columns: ExportColumn[]
  rows: Record<string, any>[]
  filename: string       // e.g. "animals-2026-06"
  title: string          // shown in PDF header
  disabled?: boolean
}

export default function ExportButtons({ columns, rows, filename, title, disabled }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePDF = async () => {
    if (disabled || pdfLoading || !rows.length) return
    setPdfLoading(true)
    try {
      await exportPDF(columns, rows, filename, title)
    } finally {
      setPdfLoading(false)
    }
  }

  const isEmpty = !rows.length || disabled

  return (
    <div className="flex items-center gap-1.5" title={isEmpty ? 'No data to export' : undefined}>
      <span className="text-xs text-gray-400 mr-0.5 hidden sm:inline">Export:</span>

      {/* CSV */}
      <button
        onClick={() => !isEmpty && exportCSV(columns, rows, filename)}
        disabled={isEmpty}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
          border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
        title="Download CSV"
      >
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2h8l4 4v8H2V2z"/><path d="M10 2v4h4"/>
        </svg>
        CSV
      </button>

      {/* Excel */}
      <button
        onClick={() => !isEmpty && exportExcel(columns, rows, filename)}
        disabled={isEmpty}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
          border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
        title="Download Excel"
      >
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2h8l4 4v8H2V2z"/><path d="M10 2v4h4"/><path d="M5 8l2 2 2-2m-2 2v3"/>
        </svg>
        Excel
      </button>

      {/* PDF */}
      <button
        onClick={handlePDF}
        disabled={isEmpty || pdfLoading}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
          border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
        title="Download PDF"
      >
        {pdfLoading ? (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6" strokeOpacity=".25"/><path d="M8 2a6 6 0 016 6"/>
          </svg>
        ) : (
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2h8l4 4v8H2V2z"/><path d="M10 2v4h4"/><path d="M5 9h4m-4 2h2"/>
          </svg>
        )}
        PDF
      </button>
    </div>
  )
}
