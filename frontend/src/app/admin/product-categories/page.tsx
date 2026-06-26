'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productCategoriesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

export default function ProductCategoriesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [editItem, setEditItem] = useState<any>(null)
  const [editName, setEditName] = useState('')

  const { data } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productCategoriesAPI.list().then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => productCategoriesAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['product-categories'] }); toast.success('Category added'); setShowAdd(false); setNewName('') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => productCategoriesAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['product-categories'] }); toast.success('Updated'); setEditItem(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productCategoriesAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['product-categories'] }); toast.success('Deleted') },
  })

  const items: any[] = data ?? []

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Categories</h1>
          <p className="page-subtitle">Manage categories used in inventory products</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Category</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="text-left px-4 py-3 text-xs">Category Name</th>
              <th className="text-left px-4 py-3 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="table-row">
                <td className="table-cell font-medium">{item.name}</td>
                <td className="table-cell">
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditItem(item); setEditName(item.name) }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete category "${item.name}"?`)) deleteMutation.mutate(item.id) }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center py-12 text-gray-400">
                  No categories yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Category</h2>
              <button onClick={() => { setShowAdd(false); setNewName('') }} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ name: newName }) }} className="p-5 space-y-4">
              <div>
                <label className="label">Category Name *</label>
                <input className="input" required autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Feed, Medicine, Equipment" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setNewName('') }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Edit Category</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); updateMutation.mutate({ id: editItem.id, data: { name: editName } }) }} className="p-5 space-y-4">
              <div>
                <label className="label">Category Name *</label>
                <input className="input" required autoFocus value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditItem(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
