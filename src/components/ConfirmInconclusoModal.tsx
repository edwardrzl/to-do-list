import type { Tarea, Recurrencia } from '../types'

// Modal de confirmación antes de marcar una tarea como inconclusa (FIX #5).
// Si es una recurrente con racha activa, advierte que se romperá la racha y
// que solo podrá deshacerse hoy. Si no, una confirmación simple.
export default function ConfirmInconclusoModal({
  tarea,
  recurrencias,
  onConfirm,
  onCancel,
}: {
  tarea: Tarea
  recurrencias: Recurrencia[]
  onConfirm: () => void
  onCancel: () => void
}) {
  const rec = tarea.recurrenciaId
    ? recurrencias.find((r) => r.id === tarea.recurrenciaId)
    : null
  const rachaActual = rec?.rachaActual ?? 0
  const rompeRacha = rachaActual > 0

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start gap-3 mb-3">
          <span
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
              rompeRacha ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800">Marcar como inconclusa</h2>
            <p className="text-sm text-gray-500 truncate">{tarea.nombre}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          {rompeRacha ? (
            <>
              Esto romperá tu racha de{' '}
              <span className="font-semibold text-red-600">
                {rachaActual} día{rachaActual === 1 ? '' : 's'}
              </span>
              . Solo podrás deshacerlo hoy mismo.
            </>
          ) : (
            '¿Marcar como inconclusa?'
          )}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${
              rompeRacha ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
