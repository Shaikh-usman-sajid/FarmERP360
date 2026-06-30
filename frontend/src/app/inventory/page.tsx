'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryAPI, productCategoriesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyTx = { product_id: '', transaction_type: 'in' as const, quantity: '', unit_cost: '', reference: '', notes: '', transaction_date: today }

export default function InventoryPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'products' | 'transactions'>('products')
  const [showAddTx, setShowAddTx] = useState(false)
  const [txForm, setTxForm] = useState(emptyTx)

  const [pSearch, setPSearch] = useState('')
  const [pCategory, setPCategory] = useState('')
  const [pStatus, setPStatus] = useState('')

  const [tProduct, setTProduct] = useState('')
  const [tType, setTType] = useState('')
  const [tDateFrom, setTDateFrom] = useState('')
  const [tDateTo, setTDateTo] = useState('')

  const hasProductFilter = !!(pSearch || pCategory || pStatus)
  const hasTxFilter = !!(tProduct || tType || tDateFrom || tDateTo)

  const clearProductFilters = () => { setPSearch(''); setPCategory(''); setPStatus('') }
  const clearTxFilters = () => { setTProduct(''); setTType(''); setTDateFrom(''); setTDateTo('') }

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productCategoriesAPI.list().then(r => r.data.data),
  })
  const categories: any[] = categoriesData ?? []

  const { data: products } = useQuery({
    queryKey: ['products', pSearch, pCategory],
    queryFn: () => inventoryAPI.listProducts({ per_page: 50, search: pSearch || undefined, category: pCategory || undefined }).then(r => r.data.data),
  })

  const { data: transactions } = useQuery({
    queryKey: ['inventory-tx', tProduct, tType, tDateFrom, tDateTo],
    queryFn: () => inventoryAPI.listTransactions({ per_page: 50, product_id: tProduct || undefined, transaction_type: tType || undefined, date_from: tDateFrom || undefined, date_to: tDateTo || undefined }).then(r => r.data.data),
    enabled: tab === 'transactions',
  })

  const createTx = useMutation({
    mutationFn: (d: any) => inventoryAPI.createTransaction(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['inventory-tx'] }); toast.success('Transaction recorded!'); setShowAddTx(false); setTxForm(emptyTx) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const getProductName = (id: string) => products?.items?.find((p: any) => p.id === id)?.name || 'Unknown'

  const filteredProducts = (products?.items ?? []).filter((p: any) => {
    if (pStatus === 'low' && parseFloat(p.current_stock) > parseFloat(p.min_stock_level || '0')) return false
    if (pStatus === 'ok' && parseFloat(p.current_stock) <= parseFloat(p.min_stock_level || '0')) return false
    return true
  })

  const filteredTransactions = (transactions?.items ?? []).filter((t: any) => {
    if (tProduct && t.product_id !== tProduct) return false
    return true
  })

  const productRows = filteredProducts.map((p: any) => ({
    name: p.name,
    category: p.category ?? '',
    unit: p.unit,
    current_stock: parseFloat(p.current_stock).toFixed(1),
    min_stock_level: p.min_stock_level ? parseFloat(p.min_stock_level).toFixed(1) : '',
    unit_cost_pkr: p.unit_cost ? parseFloat(p.unit_cost).toLocaleString() : '',
    status: parseFloat(p.current_stock) <= parseFloat(p.min_stock_level || '0') ? 'Low Stock' : 'OK',
  }))

  const transactionRows = filteredTransactions.map((t: any) => ({
    product: getProductName(t.product_id),
    type: t.transaction_type === 'in' ? 'Purchase' : t.transaction_type === 'out' ? 'OUT' : 'Adjustment',
    quantity: parseFloat(t.quantity).toFixed(2),
    date: t.transaction_date,
    reference: t.reference ?? '',
    total_cost_pkr: t.total_cost ? Number(t.total_cost).toLocaleString() : '',
  }))

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Feed, medicine, and supplies</p>
        </div>
        <div className="flex gap-2 items-center">
          {tab === 'products' && (
            <ExportButtons
              columns={[
                { header: 'Product', key: 'name' },
                { header: 'Category', key: 'category' },
                { header: 'Unit', key: 'unit' },
                { header: 'Current Stock', key: 'current_stock' },
                { header: 'Min Stock', key: 'min_stock_level' },
                { header: 'Unit Cost (PKR)', key: 'unit_cost_pkr' },
                { header: 'Status', key: 'status' },
              ]}
              rows={productRows}
              filename="farmerp360-inventory"
              title="Inventory"
            />
          )}
          {tab === 'transactions' && (
            <ExportButtons
              columns={[
                { header: 'Product', key: 'product' },
                { header: 'Type', key: 'type' },
                { header: 'Quantity', key: 'quantity' },
                { header: 'Date', key: 'date' },
                { header: 'Reference', key: 'reference' },
                { header: 'Total Cost (PKR)', key: 'total_cost_pkr' },
              ]}
              rows={transactionRows}
              filename="farmerp360-inventory"
              title="Inventory"
            />
          )}
          <button onClick={() => setShowAddTx(true)} className="btn-primary">+ Record Purchase</button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5">
        {(['products', 'transactions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'products' ? 'Products & Stock' : 'Transactions'}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="label">Search</label>
              <input className="input" placeholder="Product name..." value={pSearch} onChange={e => setPSearch(e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={pCategory} onChange={e => setPCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Stock Status</label>
              <select className="input" value={pStatus} onChange={e => setPStatus(e.target.value)}>
                <option value="">All</option>
                <option value="low">Low Stock</option>
                <option value="ok">OK</option>
              </select>
            </div>
            {hasProductFilter && (
              <button onClick={clearProductFilters} className="btn-secondary text-sm">✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="label">Product</label>
              <select className="input" value={tProduct} onChange={e => setTProduct(e.target.value)}>
                <option value="">All Products</option>
                {(products?.items ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={tType} onChange={e => setTType(e.target.value)}>
                <option value="">All Types</option>
                <option value="in">IN (Purchase)</option>
                <option value="out">OUT (Auto-deducted)</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="label">Date From</label>
              <input type="date" className="input" value={tDateFrom} onChange={e => setTDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Date To</label>
              <input type="date" className="input" value={tDateTo} onChange={e => setTDateTo(e.target.value)} />
            </div>
            {hasTxFilter && (
              <button onClick={clearTxFilters} className="btn-secondary text-sm">✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {['Product', 'Category', 'Unit', 'Stock', 'Min Stock', 'Unit Cost', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p: any) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell">{p.category || '—'}</td>
                  <td className="table-cell">{p.unit}</td>
                  <td className="table-cell font-bold text-gray-900">{parseFloat(p.current_stock).toFixed(1)}</td>
                  <td className="table-cell text-gray-400">{p.min_stock_level ? parseFloat(p.min_stock_level).toFixed(1) : '—'}</td>
                  <td className="table-cell">PKR {p.unit_cost ? parseFloat(p.unit_cost).toLocaleString() : '—'}</td>
                  <td className="table-cell">
                    {parseFloat(p.current_stock) <= parseFloat(p.min_stock_level || '0')
                      ? <span className="badge-danger">Low Stock</span>
                      : <span className="badge-active">OK</span>}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {['Product', 'Type', 'Quantity', 'Date', 'Reference', 'Total Cost'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t: any) => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell font-medium">{getProductName(t.product_id)}</td>
                  <td className="table-cell">
                    <span className={t.transaction_type === 'in' ? 'badge-active' : t.transaction_type === 'out' ? 'badge-danger' : 'badge-info'}>
                      {t.transaction_type === 'in' ? 'Purchase' : t.transaction_type === 'out' ? 'OUT' : 'Adjustment'}
                    </span>
                  </td>
                  <td className="table-cell font-bold">{parseFloat(t.quantity).toFixed(2)}</td>
                  <td className="table-cell">{t.transaction_date}</td>
                  <td className="table-cell">{t.reference || '—'}</td>
                  <td className="table-cell">{t.total_cost ? `PKR ${Number(t.total_cost).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Record Purchase</h2>
                <p className="text-xs text-gray-500 mt-0.5">Add procured stock to inventory</p>
              </div>
              <button onClick={() => setShowAddTx(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              const d: any = { ...txForm }
              d.quantity = parseFloat(d.quantity)
              if (d.unit_cost) { d.unit_cost = parseFloat(d.unit_cost); d.total_cost = d.quantity * d.unit_cost } else { delete d.unit_cost }
              if (!d.reference) delete d.reference
              if (!d.notes) delete d.notes
              createTx.mutate(d)
            }} className="p-5 space-y-4">
              <div>
                <label className="label">Product *</label>
                <select className="input" required value={txForm.product_id} onChange={e => setTxForm({ ...txForm, product_id: e.target.value })}>
                  <option value="">Select product...</option>
                  {(products?.items ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({parseFloat(p.current_stock).toFixed(1)} {p.unit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity *</label>
                  <input type="number" step="0.01" min="0.01" className="input" required value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit Cost (PKR)</label>
                  <input type="number" min="0" className="input" value={txForm.unit_cost} onChange={e => setTxForm({ ...txForm, unit_cost: e.target.value })} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="label">Purchase Date *</label>
                  <input type="date" className="input" required value={txForm.transaction_date} onChange={e => setTxForm({ ...txForm, transaction_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Reference / Bill No.</label>
                <input className="input" value={txForm.reference} onChange={e => setTxForm({ ...txForm, reference: e.target.value })} placeholder="PO number, bill, etc." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddTx(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createTx.isPending} className="btn-primary">{createTx.isPending ? 'Saving...' : 'Record Purchase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
