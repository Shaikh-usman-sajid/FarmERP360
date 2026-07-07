'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { animalsAPI, pallaiAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

function formatUploadedAt(iso: string | null | undefined): string {
  if (!iso) return 'Unknown date'
  const d = new Date(iso)
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AnimalGalleryPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isPallaiCustomer = user?.role === 'pallai_customer'

  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // ── Queries ──────────────────────────────────────────────────
  const { data: portalAnimals } = useQuery({
    queryKey: ['pallai-portal-animals'],
    queryFn: () => pallaiAPI.portalAnimals().then(r => r.data.data || []),
    enabled: isPallaiCustomer,
  })

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
  const photoList: any[] = photos as any[]

  // ── Mutations ────────────────────────────────────────────────
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
      // Close lightbox if the deleted photo was open
      setLightboxIndex(null)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    uploadMutation.mutate({ id: selected.id, file })
  }

  // ── Lightbox keyboard navigation ─────────────────────────────
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const prevPhoto = useCallback(() => {
    setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i))
  }, [])

  const nextPhoto = useCallback(() => {
    setLightboxIndex(i => (i !== null && i < photoList.length - 1 ? i + 1 : i))
  }, [photoList.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto])

  const filteredAnimals = animals.filter((a: any) =>
    !search || a.animal_code?.toLowerCase().includes(search.toLowerCase()) || a.name?.toLowerCase().includes(search.toLowerCase())
  )

  const currentPhoto = lightboxIndex !== null ? photoList[lightboxIndex] : null

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden -mx-6 -my-6">
        {/* Left panel: animal list */}
        <div className="w-72 flex-shrink-0 border-r bg-white flex flex-col">
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
                  onClick={() => { setSelected(a); setLightboxIndex(null) }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-green-50 transition-colors flex items-center gap-3 ${selected?.id === a.id ? 'bg-green-50 border-l-2 border-l-green-600' : ''}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl flex-shrink-0">
                    {a.species === 'GOAT' ? '🐐' : a.species === 'BUFFALO' ? '🐃' : '🐄'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-green-700 text-sm">{a.animal_code}</div>
                    {a.name && <div className="text-xs text-gray-600 truncate">{a.name}</div>}
                    <div className="text-xs text-gray-400 capitalize">{a.species?.toLowerCase()} · {a.breed || '—'}</div>
                  </div>
                  {a.photo_count > 0 && (
                    <span className="ml-auto text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">{a.photo_count}</span>
                  )}
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
                  <span className="ml-3 text-gray-400">{photoList.length} photo{photoList.length !== 1 ? 's' : ''}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isPallaiCustomer && (
                  <>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      className="btn-primary text-sm"
                    >
                      {uploadMutation.isPending ? 'Uploading...' : '+ Upload Photo'}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </>
                )}
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
            </div>

            {/* Photo grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {photoList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <div className="text-5xl mb-3">📷</div>
                  <p className="text-lg font-medium">No photos yet</p>
                  <p className="text-sm mt-1">
                    {isPallaiCustomer ? 'No photos have been added for your animals yet.' : 'Click "Upload Photo" to add the first photo for this animal'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photoList.map((ph: any, idx: number) => (
                    <div key={ph.id} className="group relative flex flex-col">
                      {/* Photo tile */}
                      <div
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 shadow-sm cursor-pointer"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <img
                          src={ph.photo_url || ph.file_path}
                          alt={`${selected.animal_code} photo`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {/* Primary badge */}
                        {ph.is_primary && (
                          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium shadow">
                            ★ Primary
                          </div>
                        )}
                        {/* Hover overlay: view icon + delete */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); setLightboxIndex(idx) }}
                            className="bg-white text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100 font-medium shadow"
                          >
                            🔍 View Full
                          </button>
                          {!isPallaiCustomer && (
                            <button
                              onClick={e => { e.stopPropagation(); if (confirm('Delete this photo?')) deleteMutation.mutate(ph.id) }}
                              className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 shadow"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Date/time below tile */}
                      <div className="mt-1.5 px-1">
                        <p className="text-xs text-gray-500 leading-tight">{formatShortDate(ph.uploaded_at)}</p>
                        {ph.caption && <p className="text-xs text-gray-400 truncate mt-0.5">{ph.caption}</p>}
                      </div>
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

      {/* ── LIGHTBOX ──────────────────────────────────────────────── */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none z-10"
          >
            ✕
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
            {lightboxIndex + 1} / {photoList.length}
          </div>

          {/* Prev arrow */}
          {lightboxIndex > 0 && (
            <button
              onClick={e => { e.stopPropagation(); prevPhoto() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl z-10 transition-colors"
            >
              ‹
            </button>
          )}

          {/* Next arrow */}
          {lightboxIndex < photoList.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); nextPhoto() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl z-10 transition-colors"
            >
              ›
            </button>
          )}

          {/* Main image */}
          <div
            className="max-w-5xl max-h-[80vh] w-full mx-16 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={currentPhoto.photo_url || currentPhoto.file_path}
              alt={`${selected?.animal_code} photo`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
            />

            {/* Info bar below image */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 w-full px-2">
              <div>
                {currentPhoto.is_primary && (
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium mr-2">★ Primary</span>
                )}
                {currentPhoto.caption && (
                  <span className="text-white/80 text-sm">{currentPhoto.caption}</span>
                )}
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Uploaded</p>
                <p className="text-white/90 text-sm font-medium">{formatUploadedAt(currentPhoto.uploaded_at)}</p>
              </div>
            </div>

            {/* Delete in lightbox (non-customer only) */}
            {!isPallaiCustomer && (
              <div className="mt-3">
                <button
                  onClick={() => { if (confirm('Delete this photo?')) deleteMutation.mutate(currentPhoto.id) }}
                  className="text-xs bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Delete Photo
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {photoList.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-3 flex gap-2 overflow-x-auto justify-center">
              {photoList.map((ph: any, idx: number) => (
                <button
                  key={ph.id}
                  onClick={e => { e.stopPropagation(); setLightboxIndex(idx) }}
                  className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${idx === lightboxIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={ph.photo_url || ph.file_path} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
