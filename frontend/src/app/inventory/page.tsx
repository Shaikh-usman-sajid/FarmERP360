'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyProduct = { name: '', category: '', unit: 'kg', min_stock_level: '', unit_cost: '', description: '' }
const emptyTx = { product_id: '', transaction_type: 'in', quantity: '', unit_cost: '', reference: '', notes: '', transaction_date: today }

export default function InventoryPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'products' | 'transactions'>('products')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [txForm, setTxForm] = useState(emptyTx)

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => inventoryAPI.listProducts({ per_page: 50 }).then(r => r.data.data),
  })

  const { data: transactions } = useQuery({
    queryKey: ['inventory-tx'],
    queryFn: () => inventoryAPI.listTransactions({ per_page: 50 }).then(r => r.data.data),
    enabled: tab === 'transactions',
  })

  const createProduct = useMutation({
    mutationFn: (d: any) => inventoryAPI.createProduct(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product added!'); setShowAddProduct(false); setProductForm(emptyProduct) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const createTx = useMutation({
    mutationFn: (d: any) => inventoryAPI.createTransaction(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['inventory-tx'] }); toast.success('Transaction recorded!'); setShowAddTx(false); setTxForm(emptyTx) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const getProductName = (id: string) => products?.items?.find((p: any) => p.id === id)?.name || 'Unknown'

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Feed, medicine, and supplies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddTx(true)} className="btn-secondary">+ Stock Transaction</button>
          <button onClick={() => setShowAddProduct(true)} className="btn-primary">+ Add Product</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5">
        {(['products', 'transactions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'products' ? 'Products & Stock' : 'Transactions'}
          </button>
        ))}
      </div>

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
              {(products?.items ?? []).map((p: any) => (
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
              {(products?.items ?? []).length === 0 && (
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
              {(transactions?.items ?? []).map((t: any) => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell font-medium">{getProductName(t.product_id)}</td>
                  <td className="table-cell">
                    <span className={t.transaction_type === 'in' ? 'badge-active' : t.transaction_type === 'out' ? 'badge-danger' : 'badge-info'}>
                      {t.transaction_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell font-bold">{parseFloat(t.quantity).toFixed(2)}</td>
                  <td className="table-cell">{t.transaction_date}</td>
                  <td className="table-cell">{t.reference || '—'}</td>
                  <td className="table-cell">{t.total_cost ? `PKR ${Number(t.total_cost).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
              {(transactions?.items ?? []).length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Product</h2>
              <button onClick={() => setShowAddProduct(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const d: any = { ...productForm }; if (d.min_stock_level) d.min_stock_level = parseFloat(d.min_stock_level); if (d.unit_cost) d.unit_cost = parseFloat(d.unit_cost); createProduct.mutate(d) }} className="p-5 space-y-4">
              <div>
                <label className="label">Product Name *</label>
                <input className="input" required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
                    <option value="">Select...</option>
                    {['Feed', 'Medicine', 'Supplement', 'Equipment', 'Seed', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })}>
                    {['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'vial', 'bag'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Min Stock</label>
                  <input type="number" className="input" value={productForm.min_stock_level} onChange={e => setProductForm({ ...productForm, min_stock_level: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit Cost (PKR)</label>
                  <input type="number" className="input" value={productForm.unit_cost} onChange={e => setProductForm({ ...productForm, unit_cost: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddProduct(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createProduct.isPending} className="btn-primary">{createProduct.isPending ? 'Saving...' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Stock Transaction</h2>
              <button onClick={() => setShowAddTx(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const d: any = { ...txForm }; d.quantity = parseFloat(d.quantity); if (d.unit_cost) d.unit_cost = parseFloat(d.unit_cost); if (d.unit_cost) d.total_cost = d.quantity * d.unit_cost; createTx.mutate(d) }} className="p-5 space-y-4">
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
                  <label className="label">Type *</label>
                  <select className="input" value={txForm.transaction_type} onChange={e => setTxForm({ ...txForm, transaction_type: e.target.value })}>
                    <option value="in">IN (Purchase)</option>
                    <option value="out">OUT (Usage)</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="label">Quantity *</label>
                  <input type="number" step="0.01" className="input" required value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit Cost (PKR)</label>
                  <input type="number" className="input" value={txForm.unit_cost} onChange={e => setTxForm({ ...txForm, unit_cost: e.target.value })} />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" required value={txForm.transaction_date} onChange={e => setTxForm({ ...txForm, transaction_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Reference</label>
                <input className="input" value={txForm.reference} onChange={e => setTxForm({ ...txForm, reference: e.target.value })} placeholder="PO number, bill, etc." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddTx(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createTx.isPending} className="btn-primary">{createTx.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
