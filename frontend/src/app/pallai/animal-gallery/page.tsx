'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { animalsAPI, pallaiAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function AnimalGalleryPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isPallaiCustomer = user?.role === 'pallai_customer'

  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // For pallai customers, fetch only their subscribed animals
  const { data: portalAnimals } = useQuery({
    queryKey: ['pallai-portal-animals'],
    queryFn: () => pallaiAPI.portalAnimals().then(r => r.data.data || []),
    enabled: isPallaiCustomer,
  })

  // For admin/farm roles, fetch all animals
  const { data: allAnimals, isLoading } = useQuery({
    queryKey: ['animals-gallery', search],
    queryFn: () => animalsAPI.list({ per_page: 200, search: search || undefined }).then(r => r.data.data?.items || []),
    enabled: !isPallaiCustomer,
  })

  const animals: any[] = isPallaiCustomer ? (portalAnimals ?? []) : (allAnimals ?? [])

  const { data: photos = [] } = useQuery({
    queryKey: ['animal-photos', selected?.id],
    queryFn: () => animalsAPI.getPhotos(selected.id).then(r => r.data.data || []),
    enabled: !!selected,
  })

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => animalsAPI.uploadPhoto(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animal-photos', selected?.id] })
      toast.success('Photo uploaded')
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: () => toast.error('Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => animalsAPI.deletePhoto(photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animal-photos', selected?.id] })
      toast.success('Photo deleted')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    uploadMutation.mutate({ id: selected.id, file })
  }

  const primaryPhoto = (animalId: string) => {
    // We'll show a placeholder; primary photo is only known after photos are loaded
    return null
  }

  const filteredAnimals = animals.filter((a: any) =>
    !search || a.animal_code?.toLowerCase().includes(search.toLowerCase()) || a.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden -mx-6 -my-6">
        {/* Left panel: animal list */}
        <div className="w-80 flex-shrink-0 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-lg font-bold text-gray-900 mb-3">Animal Albums</h1>
            {!isPallaiCustomer && (
              <input
                className="input text-sm"
                placeholder="Search by code or name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            )}
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading animals...</div>
          ) : filteredAnimals.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4 text-center">
              {search ? 'No animals match your search' : 'No animals found'}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredAnimals.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-green-50 transition-colors flex items-center gap-3 ${selected?.id === a.id ? 'bg-green-50 border-l-2 border-l-green-600' : ''}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    🐄
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-green-700 text-sm">{a.animal_code}</div>
                    {a.name && <div className="text-xs text-gray-600 truncate">{a.name}</div>}
                    <div className="text-xs text-gray-400 capitalize">{a.species?.toLowerCase()} · {a.breed || '—'}</div>
                  </div>
                  <div className="ml-auto text-gray-300 text-sm">▶</div>
                </button>
              ))}
            </div>
          )}
          <div className="p-3 border-t text-xs text-gray-400 text-center">
            {filteredAnimals.length} animal{filteredAnimals.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Right panel: album view */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            {/* Album header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selected.animal_code}{selected.name ? ` — ${selected.name}` : ''}
                </h2>
                <p className="text-sm text-gray-500 capitalize">
                  {selected.species?.toLowerCase()} · {selected.breed || '—'} · {selected.gender || '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{(photos as any[]).length} photo{(photos as any[]).length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {uploadMutation.isPending ? 'Uploading...' : '+ Upload Photo'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl ml-2">✕</button>
              </div>
            </div>

            {/* Photo grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {(photos as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <div className="text-5xl mb-3">📷</div>
                  <p className="text-lg font-medium">No photos yet</p>
                  <p className="text-sm mt-1">Click "Upload Photo" to add the first photo for this animal</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(photos as any[]).map((ph: any) => (
                    <div key={ph.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-200 shadow-sm">
                      <img
                        src={ph.photo_url || ph.file_path}
                        alt={`${selected.animal_code} photo`}
                        className="w-full h-full object-cover"
                      />
                      {ph.is_primary && (
                        <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium">
                          Primary
                        </div>
                      )}
                      {!isPallaiCustomer && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => { if (confirm('Delete this photo?')) deleteMutation.mutate(ph.id) }}
                            className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-lg font-medium text-gray-500">Select an animal to view its album</p>
            <p className="text-sm mt-1">Choose an animal from the list on the left</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
