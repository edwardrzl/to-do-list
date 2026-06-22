import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Tarea, Categoria } from '../types'
import { CATEGORIAS, CATEGORIA_COLORES } from '../types'
import { useTareas } from '../context/TareasContext'

interface Props {
  tarea?: Tarea | null
  onClose: () => void
}

const EMPTY: Omit<Tarea, 'id' | 'creadaEn' | 'completada'> = {
  nombre: '',
  categoria: undefined,
  fecha: undefined,
  hora: undefined,
}

export default function TaskModal({ tarea, onClose }: Props) {
  const { crearTarea, editarTarea, eliminarTarea } = useTareas()
  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tarea) {
      setForm({
        nombre: tarea.nombre,
        categoria: tarea.categoria,
        fecha: tarea.fecha,
        hora: tarea.hora,
      })
    } else {
      setForm({ ...EMPTY })
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [tarea])

  function handleChange<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'fecha' && !value) {
        next.hora = undefined
      }
      return next
    })
    if (key === 'nombre') setError('')
  }

  async function handleSave() {
    const nombre = form.nombre.trim()
    if (!nombre) {
      setError('El nombre es obligatorio')
      inputRef.current?.focus()
      return
    }
    const data = {
      nombre,
      categoria: form.categoria,
      fecha: form.fecha || undefined,
      hora: form.fecha && form.hora ? form.hora : undefined,
    }
    if (tarea) {
      await editarTarea(tarea.id, data)
    } else {
      await crearTarea(data)
    }
    onClose()
  }

  async function handleDelete() {
    if (!tarea) return
    await eliminarTarea(tarea.id)
    onClose()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const nombre = form.nombre.trim()
      if (!nombre) {
        setError('El nombre es obligatorio')
        return
      }
      const data = {
        nombre,
        categoria: form.categoria,
        fecha: form.fecha || undefined,
        hora: form.fecha && form.hora ? form.hora : undefined,
      }
      if (tarea) {
        editarTarea(tarea.id, data).then(onClose)
      } else {
        crearTarea(data).then(() => {
          setForm({ ...EMPTY })
          inputRef.current?.focus()
        })
      }
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {tarea ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

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
          {!tarea && (
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
                  onClick={() =>
                    handleChange('categoria', active ? undefined : (cat as Categoria))
                  }
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

        {/* Fecha y hora */}
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

        {/* Acciones */}
        <div className="flex gap-3">
          {tarea && (
            <button
              onClick={handleDelete}
              className="px-4 py-3 rounded-xl text-red-500 border border-red-200 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 active:bg-indigo-700 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
