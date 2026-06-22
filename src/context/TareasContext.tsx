import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Tarea } from '../types'
import { getAllTareas, saveTarea, deleteTarea } from '../db'

interface TareasContextValue {
  tareas: Tarea[]
  loading: boolean
  crearTarea: (data: Omit<Tarea, 'id' | 'creadaEn' | 'completada'>) => Promise<void>
  editarTarea: (id: string, data: Partial<Omit<Tarea, 'id' | 'creadaEn'>>) => Promise<void>
  toggleCompletada: (id: string) => Promise<void>
  eliminarTarea: (id: string) => Promise<void>
}

const TareasContext = createContext<TareasContextValue | null>(null)

export function TareasProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllTareas().then((data) => {
      setTareas(data)
      setLoading(false)
    })
  }, [])

  const crearTarea = useCallback(
    async (data: Omit<Tarea, 'id' | 'creadaEn' | 'completada'>) => {
      const nueva: Tarea = {
        ...data,
        id: uuidv4(),
        completada: false,
        creadaEn: new Date().toISOString(),
      }
      await saveTarea(nueva)
      setTareas((prev) => [...prev, nueva])
    },
    []
  )

  const editarTarea = useCallback(
    async (id: string, data: Partial<Omit<Tarea, 'id' | 'creadaEn'>>) => {
      setTareas((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, ...data } : t))
        const tarea = updated.find((t) => t.id === id)
        if (tarea) saveTarea(tarea)
        return updated
      })
    },
    []
  )

  const toggleCompletada = useCallback(async (id: string) => {
    setTareas((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, completada: !t.completada } : t
      )
      const tarea = updated.find((t) => t.id === id)
      if (tarea) saveTarea(tarea)
      return updated
    })
  }, [])

  const eliminarTarea = useCallback(async (id: string) => {
    await deleteTarea(id)
    setTareas((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <TareasContext.Provider
      value={{ tareas, loading, crearTarea, editarTarea, toggleCompletada, eliminarTarea }}
    >
      {children}
    </TareasContext.Provider>
  )
}

export function useTareas() {
  const ctx = useContext(TareasContext)
  if (!ctx) throw new Error('useTareas must be used within TareasProvider')
  return ctx
}
