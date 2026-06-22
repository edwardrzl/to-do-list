import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Tarea, Categoria } from '../types'
import { CATEGORIAS, CATEGORIA_COLORES, DIAS_SEMANA } from '../types'
import { useTareas } from '../context/TareasContext'

interface Props {
  tarea?: Tarea | null
  onClose: () => void
}

const EMPTY_FORM = {
  nombre: '',
  categoria: undefined as Categoria | undefined,
  fecha: undefined as string | undefined,
  hora: undefined as string | undefined,
}

// 'normal'  → crear tarea, o editar una ocurrencia/tarea suelta
// 'regla'   → editar todas las ocurrencias futuras de una recurrencia
type Modo = 'normal' | 'regla'

function IconRepeat({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23l-4-4 4-4"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  )
}

export default function TaskModal({ tarea, onClose }: Props) {
  const {
    crearTarea,
    editarTarea,
    eliminarTarea,
    crearRecurrencia,
    eliminarRecurrenciaCompleta,
    editarRecurrenciaFutura,
    recurrencias,
  } = useTareas()

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [esRecurrente, setEsRecurrente] = useState(false) // toggle al crear
  const [diasSel, setDiasSel] = useState<number[]>([])
  const [modo, setModo] = useState<Modo>('normal')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!tarea
  const esInstancia = !!tarea?.recurrenciaId
  const recurrencia = esInstancia
    ? recurrencias.find((r) => r.id === tarea!.recurrenciaId) ?? null
    : null

  useEffect(() => {
    if (tarea) {
      setForm({
        nombre: tarea.nombre,
        categoria: tarea.categoria,
        fecha: tarea.fecha,
        hora: tarea.hora,
      })
    } else {
      setForm({ ...EMPTY_FORM })
      setEsRecurrente(false)
      setDiasSel([])
    }
    setModo('normal')
    setError('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [tarea])

  function handleChange<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'fecha' && !value) next.hora = undefined
      return next
    })
    if (key === 'nombre') setError('')
  }

  function toggleDia(value: number) {
    setDiasSel((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    )
    setError('')
  }

  function toggleRecurrente(on: boolean) {
    setEsRecurrente(on)
    if (!on) setDiasSel([])
    setError('')
  }

  function entrarModoRegla() {
    if (!recurrencia) return
    setForm((f) => ({
      ...f,
      nombre: recurrencia.nombre,
      categoria: recurrencia.categoria,
      hora: recurrencia.hora,
      fecha: undefined,
    }))
    setDiasSel(recurrencia.dias)
    setModo('regla')
    setError('')
  }

  // Muestra selector de días cuando se está creando una recurrencia
  // o editando la serie completa.
  const mostrarDias = (!isEditing && esRecurrente) || modo === 'regla'

  // --- Guardar ---

  async function handleGuardar() {
    const nombre = form.nombre.trim()
    if (!nombre) {
      setError('El nombre es obligatorio')
      inputRef.current?.focus()
      return
    }

    // Editar la serie completa
    if (modo === 'regla' && recurrencia) {
      if (diasSel.length === 0) {
        setError('Selecciona al menos un día')
        return
      }
      await editarRecurrenciaFutura(recurrencia.id, {
        nombre,
        categoria: form.categoria,
        hora: form.hora || undefined,
        dias: diasSel,
      })
      onClose()
      return
    }

    // Crear recurrencia nueva
    if (!isEditing && esRecurrente) {
      if (diasSel.length === 0) {
        setError('Selecciona al menos un día')
        return
      }
      await crearRecurrencia({
        nombre,
        categoria: form.categoria,
        hora: form.hora || undefined,
        dias: diasSel,
      })
      onClose()
      return
    }

    // Editar una ocurrencia o tarea suelta
    const data = {
      nombre,
      categoria: form.categoria,
      fecha: form.fecha || undefined,
      hora: form.fecha && form.hora ? form.hora : undefined,
    }
    if (isEditing) {
      await editarTarea(tarea!.id, data)
    } else {
      await crearTarea(data)
    }
    onClose()
  }

  async function handleEliminarOcurrencia() {
    if (!tarea) return
    await eliminarTarea(tarea.id)
    onClose()
  }

  async function handleEliminarSerie() {
    if (!recurrencia) return
    await eliminarRecurrenciaCompleta(recurrencia.id)
    onClose()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Enter') return
    e.preventDefault()
    // Guardado rápido solo al crear una tarea normal
    if (isEditing || esRecurrente || modo === 'regla') return
    const nombre = form.nombre.trim()
    if (!nombre) { setError('El nombre es obligatorio'); return }
    crearTarea({
      nombre,
      categoria: form.categoria,
      fecha: form.fecha || undefined,
      hora: form.fecha && form.hora ? form.hora : undefined,
    }).then(() => {
      setForm({ ...EMPTY_FORM })
      inputRef.current?.focus()
    })
  }

  const titulo = !isEditing
    ? 'Nueva tarea'
    : esInstancia
      ? modo === 'regla'
        ? 'Editar serie recurrente'
        : 'Editar ocurrencia'
      : 'Editar tarea'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1" aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Aviso en instancias recurrentes */}
        {esInstancia && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-50 rounded-lg px-3 py-1.5 mb-4">
            <IconRepeat size={12} />
            {modo === 'regla'
              ? 'Editas la serie: aplica a las ocurrencias futuras pendientes'
              : 'Tarea recurrente — editas solo esta ocurrencia'}
          </div>
        )}

        {/* Nombre */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre de la tarea"
            className={`w-full border rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-400 ${
              error ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          {!isEditing && !esRecurrente && (
            <p className="text-xs text-gray-400 mt-1">
              Presiona Enter para guardar rápido y crear otra
            </p>
          )}
        </div>

        {/* Categoría */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Categoría</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((cat) => {
              const c = CATEGORIA_COLORES[cat]
              const active = form.categoria === cat
              return (
                <button
                  key={cat}
                  onClick={() => handleChange('categoria', active ? undefined : (cat as Categoria))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? `${c.bg} ${c.text} border-transparent ring-2 ring-offset-1 ring-current`
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${c.dot}`} />
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Toggle repetir — solo al crear */}
        {!isEditing && (
          <div className="mb-4">
            <button
              onClick={() => toggleRecurrente(!esRecurrente)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all w-full ${
                esRecurrente
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              <IconRepeat size={15} />
              <span className="flex-1 text-left">Repetir</span>
              <span className={`w-9 h-5 rounded-full relative transition-colors ${esRecurrente ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${esRecurrente ? 'left-4' : 'left-0.5'}`} />
              </span>
            </button>
          </div>
        )}

        {/* Selector de días (crear recurrencia o editar serie) */}
        {mostrarDias && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Días</p>
            <div className="flex gap-1.5">
              {DIAS_SEMANA.map((dia) => {
                const active = diasSel.includes(dia.value)
                return (
                  <button
                    key={dia.value}
                    onClick={() => toggleDia(dia.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white border-gray-200 text-gray-500'
                    }`}
                  >
                    {dia.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Fecha + hora, o solo hora cuando hay selector de días */}
        {mostrarDias ? (
          <div className="mb-5">
            <label className="block text-sm text-gray-500 mb-1">Hora (opcional)</label>
            <input
              type="time"
              value={form.hora ?? ''}
              onChange={(e) => handleChange('hora', e.target.value || undefined)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        ) : (
          <div className="mb-5 flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha ?? ''}
                onChange={(e) => handleChange('fecha', e.target.value || undefined)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">Hora</label>
              <input
                type="time"
                value={form.hora ?? ''}
                disabled={!form.fecha}
                onChange={(e) => handleChange('hora', e.target.value || undefined)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {/* Acciones principales */}
        <div className="flex gap-3">
          {/* En tareas sueltas mostramos el Eliminar simple a la izquierda */}
          {isEditing && !esInstancia && (
            <button
              onClick={handleEliminarOcurrencia}
              className="px-4 py-3 rounded-xl text-red-500 border border-red-200 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={modo === 'regla' ? () => setModo('normal') : onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {modo === 'regla' ? 'Volver' : 'Cancelar'}
          </button>
          <button
            onClick={handleGuardar}
            className="flex-1 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 active:bg-indigo-700 transition-colors"
          >
            Guardar
          </button>
        </div>

        {/* Opciones de serie — solo en instancias recurrentes, modo normal */}
        {esInstancia && modo === 'normal' && recurrencia && (
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
            <p className="text-xs text-gray-400 px-1">Opciones de la serie recurrente</p>
            <button
              onClick={entrarModoRegla}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors"
            >
              <IconRepeat size={14} />
              Editar todas las ocurrencias futuras
            </button>
            <button
              onClick={handleEliminarOcurrencia}
              className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Eliminar solo esta ocurrencia
            </button>
            <button
              onClick={handleEliminarSerie}
              className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              Eliminar tarea recurrente completa
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
