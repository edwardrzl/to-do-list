import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Tarea, Recurrencia } from '../types'
import {
  getAllTareas,
  saveTarea,
  deleteTarea,
  getAllRecurrencias,
  saveRecurrencia,
  deleteRecurrencia,
} from '../db'
import { initNotificaciones, syncNotificaciones } from '../notifications'

interface TareasContextValue {
  tareas: Tarea[]
  recurrencias: Recurrencia[]
  loading: boolean
  crearTarea: (data: Omit<Tarea, 'id' | 'creadaEn' | 'completada'>) => Promise<void>
  editarTarea: (id: string, data: Partial<Omit<Tarea, 'id' | 'creadaEn'>>) => Promise<void>
  toggleCompletada: (id: string) => Promise<void>
  eliminarTarea: (id: string) => Promise<void>
  crearRecurrencia: (data: Omit<Recurrencia, 'id' | 'creadaEn'>) => Promise<void>
  eliminarRecurrenciaCompleta: (recurrenciaId: string) => Promise<void>
  editarRecurrenciaFutura: (
    recurrenciaId: string,
    data: Pick<Recurrencia, 'nombre' | 'categoria' | 'hora' | 'dias'>
  ) => Promise<void>
  generarInstanciasParaSemana: (weekStart: Date) => Promise<void>
}

const TareasContext = createContext<TareasContextValue | null>(null)

// --- helpers de fecha ---

function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Convierte 'YYYY-MM-DD' a Date local (sin desfase de zona horaria).
function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function TareasProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [recurrencias, setRecurrencias] = useState<Recurrencia[]>([])
  const [loading, setLoading] = useState(true)

  // Genera y persiste las instancias faltantes de las recurrencias para la
  // semana que arranca en `weekStart` (lunes). Lee el estado autoritativo
  // desde IndexedDB para evitar closures obsoletos y duplicados.
  const generarInstanciasParaSemana = useCallback(async (weekStart: Date) => {
    const [recs, allTareas] = await Promise.all([
      getAllRecurrencias(),
      getAllTareas(),
    ])
    if (recs.length === 0) return

    const existentes = new Set(
      allTareas
        .filter((t) => t.recurrenciaId && t.fecha)
        .map((t) => `${t.recurrenciaId}|${t.fecha}`)
    )

    const nuevas: Tarea[] = []
    for (let i = 0; i < 7; i++) {
      const dia = addDays(weekStart, i)
      const dow = dia.getDay() // 0=Dom .. 6=Sáb
      const fecha = toYMD(dia)
      for (const rec of recs) {
        if (!rec.dias.includes(dow)) continue
        const key = `${rec.id}|${fecha}`
        if (existentes.has(key)) continue
        existentes.add(key)
        nuevas.push({
          id: uuidv4(),
          nombre: rec.nombre,
          categoria: rec.categoria,
          hora: rec.hora,
          fecha,
          completada: false,
          creadaEn: new Date().toISOString(),
          recurrenciaId: rec.id,
        })
      }
    }

    if (nuevas.length === 0) return
    await Promise.all(nuevas.map(saveTarea))
    setTareas((prev) => {
      const have = new Set(prev.map((t) => t.id))
      const add = nuevas.filter((n) => !have.has(n.id))
      return add.length ? [...prev, ...add] : prev
    })
  }, [])

  // Carga inicial + generación de la semana actual.
  useEffect(() => {
    ;(async () => {
      const [loadedTareas, loadedRecs] = await Promise.all([
        getAllTareas(),
        getAllRecurrencias(),
      ])
      setTareas(loadedTareas)
      setRecurrencias(loadedRecs)
      setLoading(false)
      await generarInstanciasParaSemana(getMonday(new Date()))
    })()
  }, [generarInstanciasParaSemana])

  // Pide permiso de notificaciones una vez (no-op en web).
  useEffect(() => {
    initNotificaciones()
  }, [])

  // Reprograma las notificaciones ante cualquier cambio en las tareas:
  // cubre crear, completar, editar, borrar y la generación de recurrencias.
  useEffect(() => {
    if (!loading) syncNotificaciones(tareas)
  }, [tareas, loading])

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

  const crearRecurrencia = useCallback(
    async (data: Omit<Recurrencia, 'id' | 'creadaEn'>) => {
      const rec: Recurrencia = {
        ...data,
        id: uuidv4(),
        creadaEn: new Date().toISOString(),
      }
      await saveRecurrencia(rec)
      setRecurrencias((prev) => [...prev, rec])
      // Genera de inmediato las instancias de la semana actual (incluye hoy).
      await generarInstanciasParaSemana(getMonday(new Date()))
    },
    [generarInstanciasParaSemana]
  )

  // Borra la recurrencia y TODAS sus instancias (pasadas y futuras).
  const eliminarRecurrenciaCompleta = useCallback(
    async (recurrenciaId: string) => {
      const allTareas = await getAllTareas()
      const aBorrar = allTareas.filter((t) => t.recurrenciaId === recurrenciaId)
      await Promise.all(aBorrar.map((t) => deleteTarea(t.id)))
      await deleteRecurrencia(recurrenciaId)
      setTareas((prev) => prev.filter((t) => t.recurrenciaId !== recurrenciaId))
      setRecurrencias((prev) => prev.filter((r) => r.id !== recurrenciaId))
    },
    []
  )

  // Actualiza la regla y regenera las instancias futuras pendientes
  // (las ya completadas y las pasadas no se tocan).
  const editarRecurrenciaFutura = useCallback(
    async (
      recurrenciaId: string,
      data: Pick<Recurrencia, 'nombre' | 'categoria' | 'hora' | 'dias'>
    ) => {
      const recs = await getAllRecurrencias()
      const rec = recs.find((r) => r.id === recurrenciaId)
      if (!rec) return
      const actualizada: Recurrencia = { ...rec, ...data }
      await saveRecurrencia(actualizada)
      setRecurrencias((prev) =>
        prev.map((r) => (r.id === recurrenciaId ? actualizada : r))
      )

      const today = toYMD(new Date())
      const allTareas = await getAllTareas()
      const aBorrar = allTareas.filter(
        (t) =>
          t.recurrenciaId === recurrenciaId &&
          !t.completada &&
          (t.fecha ?? '') >= today
      )
      await Promise.all(aBorrar.map((t) => deleteTarea(t.id)))
      const borradosIds = new Set(aBorrar.map((t) => t.id))
      setTareas((prev) => prev.filter((t) => !borradosIds.has(t.id)))

      // Regenera con la regla nueva: la semana actual + todas las semanas que
      // tenían instancias borradas (para que cualquier semana ya visitada quede
      // consistente sin depender de re-navegar).
      const mondays = new Map<string, Date>()
      const hoyMonday = getMonday(new Date())
      mondays.set(toYMD(hoyMonday), hoyMonday)
      for (const t of aBorrar) {
        if (!t.fecha) continue
        const m = getMonday(ymdToDate(t.fecha))
        mondays.set(toYMD(m), m)
      }
      for (const m of mondays.values()) {
        await generarInstanciasParaSemana(m)
      }
    },
    [generarInstanciasParaSemana]
  )

  return (
    <TareasContext.Provider
      value={{
        tareas,
        recurrencias,
        loading,
        crearTarea,
        editarTarea,
        toggleCompletada,
        eliminarTarea,
        crearRecurrencia,
        eliminarRecurrenciaCompleta,
        editarRecurrenciaFutura,
        generarInstanciasParaSemana,
      }}
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
