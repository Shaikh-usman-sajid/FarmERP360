import * as XLSX from 'xlsx'

export interface ExportColumn {
  header: string
  key: string
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(columns: ExportColumn[], rows: Record<string, any>[], filename: string) {
  const headers = columns.map(c => `"${c.header}"`)
  const data = rows.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    })
  )
  const csv = [headers.join(','), ...data.map(r => r.join(','))].join('\n')
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

export function exportExcel(columns: ExportColumn[], rows: Record<string, any>[], filename: string, sheetName = 'Sheet1') {
  const worksheetData = [
    columns.map(c => c.header),
    ...rows.map(row => columns.map(c => row[c.key] ?? '')),
  ]
  const ws = XLSX.utils.aoa_to_sheet(worksheetData)

  // Bold header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: col })
    if (ws[cell]) ws[cell].s = { font: { bold: true } }
  }

  // Auto column width
  ws['!cols'] = columns.map(c => ({ wch: Math.max(c.header.length + 2, 12) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function exportPDF(
  columns: ExportColumn[],
  rows: Record<string, any>[],
  filename: string,
  title: string,
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })

  // Header bar
  doc.setFillColor(22, 128, 61)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('FarmERP360', 14, 11)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 17)

  // Date
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  const dateStr = new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' })
  doc.text(`Generated: ${dateStr}`, doc.internal.pageSize.getWidth() - 14, 11, { align: 'right' })

  autoTable(doc, {
    startY: 22,
    head: [columns.map(c => c.header)],
    body: rows.map(row => columns.map(c => String(row[c.key] ?? ''))),
    headStyles: { fillColor: [22, 128, 61], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [240, 248, 240] },
    styles: { cellPadding: 2.5, overflow: 'linebreak' },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}.pdf`)
}

// ── Internal helper ───────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
