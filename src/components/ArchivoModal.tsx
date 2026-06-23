import type { Tarea } from '../types'
import EtiquetaCategoria from './EtiquetaCategoria'

function formatFecha(fecha?: string, hora?: string): string {
  if (!fecha) return ''
  const [year, month, day] = fecha.split('-')
  const dateStr = `${day}/${month}/${year}`
  return hora ? `${dateStr} ${hora}` : dateStr
}

// Lista de solo lectura de las tareas archivadas. Sin edición ni acciones.
export default function ArchivoModal({
  tareas,
  onClose,
}: {
  tareas: Tarea[]
  onClose: () => void
}) {
  const archivadas = tareas
    .filter((t) => t.archivada)
    .sort((a, b) =>
      (b.estadoCambiadoEn ?? b.creadaEn).localeCompare(a.estadoCambiadoEn ?? a.creadaEn)
    )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Archivo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {archivadas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            No hay tareas archivadas.
          </p>
        ) : (
          <div className="space-y-2">
            {archivadas.map((t) => {
              const inconclusa = t.estado === 'inconcluso'
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5"
                >
                  <span
                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white ${
                      inconclusa ? 'bg-gray-400' : 'bg-indigo-500'
                    }`}
                  >
                    {inconclusa ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 line-through break-words">
                      {t.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-[11px] font-semibold ${inconclusa ? 'text-gray-400' : 'text-indigo-400'}`}>
                        {inconclusa ? 'Inconclusa' : 'Completada'}
                      </span>
                      {t.categoria && <EtiquetaCategoria categoria={t.categoria} />}
                      {t.fecha && (
                        <span className="text-xs text-gray-400">{formatFecha(t.fecha, t.hora)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
