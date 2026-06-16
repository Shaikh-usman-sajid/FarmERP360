'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function AnimalGalleryPage() {
  const [selected, setSelected] = useState<any>(null)
  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals-gallery'],
    queryFn: () => animalsAPI.list({ ownership_type: 'pallai' }).then(r => r.data.data?.items || r.data.data || [])
  })
  const { data: photos = [] } = useQuery({
    queryKey: ['animal-photos', selected?.id],
    queryFn: () => selected ? animalsAPI.getPhotos(selected.id).then(r => r.data.data || []) : Promise.resolve([]),
    enabled: !!selected
  })

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Animal Gallery</h1>
        <p className="text-sm text-gray-500">Pallai animals photo gallery</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading animals...</div>
      ) : (animals as any[]).length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No pallai animals found. Animals with ownership_type=pallai will appear here.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(animals as any[]).map((a: any) => (
            <div key={a.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(a === selected ? null : a)}>
              <div className="w-full h-40 bg-green-50 rounded-lg flex items-center justify-center text-5xl mb-3">🐐</div>
              <div className="font-semibold text-gray-900">{a.animal_code}</div>
              <div className="text-sm text-gray-500">{a.name || a.breed}</div>
              <div className="text-xs text-gray-400 mt-1">{a.gender} · {a.breed}</div>
            </div>
          ))}
        </div>
      )}

      {/* Animal detail modal with photos */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">{selected.tag_number} — {selected.name || selected.breed}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="text-gray-500">Breed:</span> <span className="font-medium">{selected.breed}</span></div>
              <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{selected.gender}</span></div>
              <div><span className="text-gray-500">DOB:</span> <span className="font-medium">{selected.date_of_birth || '—'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="badge-active">{selected.status}</span></div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Photos ({(photos as any[]).length})</div>
              {(photos as any[]).length === 0 ? (
                <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-sm">No photos uploaded</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(photos as any[]).map((ph: any) => (
                    <img key={ph.id} src={ph.photo_url || ph.file_path} alt="Animal" className="w-full h-28 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
