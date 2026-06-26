# Import Skill — CSV Bulk Import for Any Module

Use this skill when the user says "add import to [module page]". It documents the reusable pattern for CSV import functionality.

## Pattern Overview

Every import consists of:
1. **Backend** — `POST /[module]/import` endpoint accepting `List[ModelCreate]`
2. **Frontend** — Import button → modal → file picker → CSV parse → preview → submit

---

## Backend Pattern

### Endpoint (append to existing endpoint file)

```python
from typing import List

@router.post("/import")
def import_[items](
    payload: List[ModelCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    created = 0
    skipped = 0
    errors: list = []

    for i, item in enumerate(payload):
        # Check for duplicate on unique field
        existing = db.query(Model).filter(
            Model.unique_field == item.unique_field,
            Model.organization_id == current_user.organization_id
        ).first()
        if existing:
            errors.append(f"Row {i + 1}: '{item.unique_field}' already exists — skipped")
            skipped += 1
            continue

        obj = Model(
            organization_id=current_user.organization_id,
            **item.dict()
        )
        db.add(obj)
        created += 1

    db.commit()
    return {"success": True, "created": created, "skipped": skipped, "errors": errors}
```

### API function (add to `frontend/src/lib/api.ts`)

```typescript
export const [module]API = {
  // ... existing functions
  importBulk: (rows: object[]) => api.post('/[module]/import', rows),
}
```

---

## Frontend Pattern

### Column Definitions

Define columns at the top of the page file (export so the skill can locate them):

```typescript
export const IMPORT_COLUMNS = [
  { key: 'field_key',    label: 'Column Header',   required: true,  example: 'example_value' },
  { key: 'another_key', label: 'Another Column',   required: false, example: 'optional' },
  // ...
]
```

### CSV Parser (reuse as-is)

```typescript
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
}
```

### State needed

```typescript
const [showImport, setShowImport] = useState(false)
const [importRows, setImportRows] = useState<any[]>([])
const [importErrors, setImportErrors] = useState<string[]>([])
const fileRef = useRef<HTMLInputElement>(null)
```

### Mutation

```typescript
const importMutation = useMutation({
  mutationFn: (rows: any[]) => [module]API.importBulk(rows),
  onSuccess: (res) => {
    qc.invalidateQueries({ queryKey: ['[module]'] })
    const { created, skipped, errors } = res.data
    toast.success(`Imported ${created} records${skipped ? `, ${skipped} skipped` : ''}`)
    if (errors?.length) setImportErrors(errors)
    else { setShowImport(false); setImportRows([]) }
  },
  onError: (e: any) => toast.error(e.response?.data?.detail || 'Import failed'),
})
```

### Button (add to page header)

```tsx
<button onClick={() => setShowImport(true)} className="btn-secondary">⬆ Import CSV</button>
```

### Template download helper

```typescript
const downloadTemplate = () => {
  const header = IMPORT_COLUMNS.map(c => c.label).join(',')
  const example = IMPORT_COLUMNS.map(c => c.example).join(',')
  const blob = new Blob([header + '\n' + example], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = '[module]_import_template.csv'; a.click()
  URL.revokeObjectURL(url)
}
```

### File upload handler

```typescript
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    const rows = parseCSV(ev.target?.result as string)
    setImportRows(rows)
    setImportErrors([])
  }
  reader.readAsText(file)
}
```

### Submit handler

```typescript
const submitImport = () => {
  if (!importRows.length) return
  const mapped = importRows.map(r => {
    const obj: any = {}
    IMPORT_COLUMNS.forEach(col => {
      const val = r[col.label] ?? r[col.key] ?? ''
      if (val) {
        // coerce numeric fields
        if (['price', 'quantity', 'amount', 'weight'].some(k => col.key.includes(k)))
          obj[col.key] = parseFloat(val)
        else obj[col.key] = val
      }
    })
    return obj
  })
  importMutation.mutate(mapped)
}
```

### Import Modal JSX

```tsx
{showImport && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="text-lg font-bold">Import [Module] from CSV</h2>
        <button onClick={() => { setShowImport(false); setImportRows([]); setImportErrors([]) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>
      <div className="p-5 space-y-4">
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Instructions</p>
          <p>Upload a CSV with columns: <span className="font-mono text-xs">{IMPORT_COLUMNS.map(c => c.label).join(', ')}</span></p>
          <p className="mt-1">Required: {IMPORT_COLUMNS.filter(c => c.required).map(c => c.label).join(', ')}. Duplicates are skipped.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={downloadTemplate} className="btn-secondary text-sm">⬇ Download Template</button>
          <button onClick={() => fileRef.current?.click()} className="btn-primary text-sm">📂 Choose CSV File</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </div>
        {importRows.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{importRows.length} rows parsed — preview:</p>
            <div className="overflow-x-auto border rounded">
              <table className="text-xs w-full">
                <thead className="bg-gray-50">
                  <tr>{Object.keys(importRows[0]).map(k => <th key={k} className="px-2 py-1 text-left">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t">
                      {Object.values(r).map((v: any, j) => <td key={j} className="px-2 py-1">{v}</td>)}
                    </tr>
                  ))}
                  {importRows.length > 5 && <tr><td colSpan={Object.keys(importRows[0]).length} className="px-2 py-1 text-gray-400">…and {importRows.length - 5} more rows</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {importErrors.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3 space-y-1">
            {importErrors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => { setShowImport(false); setImportRows([]); setImportErrors([]) }} className="btn-secondary">Cancel</button>
          <button onClick={submitImport} disabled={!importRows.length || importMutation.isPending} className="btn-primary">
            {importMutation.isPending ? 'Importing...' : `Import ${importRows.length} Rows`}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Reference Implementation

Animals page has the full working implementation:
- **Frontend**: `frontend/src/app/animals/page.tsx` — `IMPORT_COLUMNS`, `parseCSV`, import modal
- **Backend**: `backend/app/api/v1/endpoints/animals.py` — `POST /animals/import`
- **API**: `frontend/src/lib/api.ts` — `animalsAPI.importBulk`

## Pages Using This Pattern

| Page | Backend Endpoint | API Function | Status |
|------|-----------------|--------------|--------|
| Animals | `POST /animals/import` | `animalsAPI.importBulk` | ✅ Done |
| Milk Production | `POST /milk-productions/import` | `dairyAPI.importBulk` | ✅ Done |
| Milk Sales | `POST /milk-sales/import` | `dairyAPI.importSales` | ✅ Done |
