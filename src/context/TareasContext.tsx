import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Tarea, Recurrencia, EstadoTarea } from '../types'
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
  crearTarea: (data: Omit<Tarea, 'id' | 'creadaEn' | 'completada' | 'estado'>) => Promise<void>
  editarTarea: (id: string, data: Partial<Omit<Tarea, 'id' | 'creadaEn'>>) => Promise<void>
  toggleCompletada: (id: string) => Promise<void>
  moverEstado: (id: string, estado: EstadoTarea) => Promise<void>
  marcarInconcluso: (id: string) => Promise<void>
  revertirEstado: (id: string) => Promise<void>
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

const SIETE_DIAS_MS = 7 * 86_400_000

// Recalcula las rachas de una recurrencia SIEMPRE desde el historial real de
// sus instancias terminales (nunca como contador que se suma/resta a mano).
// Esto mata el bucle de inflar rachas y hace que revertir un done/inconcluso
// restaure el valor previo solo, sin guardar nada extra.
//
// Algoritmo:
//   1. Tomar las instancias en estado terminal (done | inconcluso). Las que
//      están en todo/doing se ignoran.
//   2. Ordenar por fecha ascendente.
//   3. Sin terminales → ambas rachas en 0.
//   4. Según el estado de la MÁS RECIENTE, contar cuántas consecutivas hacia
//      atrás comparten ese estado (hasta el estado opuesto o el inicio).
// Invariante: si una racha es > 0, la otra es 0.
function calcularRachas(
  recurrenciaId: string,
  tareas: Tarea[]
): { rachaActual: number; rachaInconclusa: number } {
  const terminales = tareas
    .filter(
      (t) =>
        t.recurrenciaId === recurrenciaId &&
        !!t.fecha &&
        (t.estado === 'done' || t.estado === 'inconcluso')
    )
    .sort((a, b) => a.fecha!.localeCompare(b.fecha!))

  if (terminales.length === 0) return { rachaActual: 0, rachaInconclusa: 0 }

  const ultimoEstado = terminales[terminales.length - 1].estado
  let count = 0
  for (let i = terminales.length - 1; i >= 0; i--) {
    if (terminales[i].estado === ultimoEstado) count++
    else break
  }
  return ultimoEstado === 'done'
    ? { rachaActual: count, rachaInconclusa: 0 }
    : { rachaActual: 0, rachaInconclusa: count }
}

export function TareasProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [recurrencias, setRecurrencias] = useState<Recurrencia[]>([])
  const [loading, setLoading] = useState(true)

  // Refs siempre actualizadas para leer el estado vigente desde callbacks sin
  // depender de closures obsoletos. Las usamos para los cambios de `estado`,
  // que deben actualizar rachas de forma exacta (no idempotente) y por eso no
  // pueden vivir dentro de un updater de setState (StrictMode los invoca 2×).
  // Se sincronizan en efectos (no en render) y se leen desde event handlers,
  // que siempre corren después del commit → quedan actualizadas a tiempo.
  const tareasRef = useRef<Tarea[]>(tareas)
  const recurrenciasRef = useRef<Recurrencia[]>(recurrencias)
  useEffect(() => { tareasRef.current = tareas }, [tareas])
  useEffect(() => { recurrenciasRef.current = recurrencias }, [recurrencias])

  // Garantiza que la rutina de apertura (archivar + auto-inconcluso) corra una
  // sola vez, aunque StrictMode monte el efecto dos veces en desarrollo.
  const initDone = useRef(false)

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
        // FIX #1: nunca generar instancias anteriores a la fecha de creación
        // de la recurrencia (evita instancias "hacia el pasado").
        if (fecha < rec.creadaEn.slice(0, 10)) continue
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
          estado: 'todo',
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

  // Rutina de apertura: (1) auto-marca como inconclusas las instancias
  // recurrentes de días anteriores que sigan en 'todo' (lo que dispara la
  // racha de inconclusas), y (2) archiva las tareas terminales con más de 7
  // días desde su último cambio de estado. Lee el estado autoritativo desde
  // IndexedDB y persiste todo en bloque.
  const procesarAlAbrir = useCallback(async () => {
    const [allTareas, allRecs] = await Promise.all([
      getAllTareas(),
      getAllRecurrencias(),
    ])
    const hoy = toYMD(new Date())
    const ahoraMs = Date.now()
    const tareasCambiadas = new Map<string, Tarea>()

    // (1) Auto-marcado de instancias recurrentes vencidas en 'todo'.
    for (const t of allTareas) {
      if (t.archivada) continue
      if (t.recurrenciaId && t.estado === 'todo' && t.fecha && t.fecha < hoy) {
        tareasCambiadas.set(t.id, {
          ...t,
          estado: 'inconcluso',
          completada: false,
          estadoCambiadoEn: new Date().toISOString(),
        })
      }
    }

    // (2) Archivado de terminales con más de 7 días (considera lo recién marcado).
    for (const t of allTareas) {
      const actual = tareasCambiadas.get(t.id) ?? t
      if (actual.archivada) continue
      if (actual.estado === 'done' || actual.estado === 'inconcluso') {
        const ref = Date.parse(actual.estadoCambiadoEn ?? actual.creadaEn)
        if (ahoraMs - ref > SIETE_DIAS_MS) {
          tareasCambiadas.set(t.id, { ...actual, archivada: true })
        }
      }
    }

    // (3) Recalcular las rachas de TODAS las recurrencias desde el historial
    // resultante (FIX #2). Nunca se incrementan a mano.
    const tareasFinales = allTareas.map((t) => tareasCambiadas.get(t.id) ?? t)
    const recsActualizadas = allRecs.map((rec) => ({
      ...rec,
      ...calcularRachas(rec.id, tareasFinales),
    }))

    await Promise.all([...tareasCambiadas.values()].map(saveTarea))
    await Promise.all(recsActualizadas.map(saveRecurrencia))

    if (tareasCambiadas.size) {
      setTareas((prev) => prev.map((t) => tareasCambiadas.get(t.id) ?? t))
    }
    setRecurrencias(recsActualizadas)
  }, [])

  // Carga inicial + rutina de apertura + generación de la semana actual.
  // El guard `initDone` evita la doble ejecución del efecto en StrictMode.
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    ;(async () => {
      const [loadedTareas, loadedRecs] = await Promise.all([
        getAllTareas(),
        getAllRecurrencias(),
      ])
      setTareas(loadedTareas)
      setRecurrencias(loadedRecs)
      setLoading(false)
      await procesarAlAbrir()
      await generarInstanciasParaSemana(getMonday(new Date()))
    })()
  }, [generarInstanciasParaSemana, procesarAlAbrir])

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
    async (data: Omit<Tarea, 'id' | 'creadaEn' | 'completada' | 'estado'>) => {
      const ahora = new Date().toISOString()
      const nueva: Tarea = {
        ...data,
        id: uuidv4(),
        completada: false,
        estado: 'todo',
        estadoCambiadoEn: ahora,
        archivada: false,
        // Base del contador de días: la fecha si la tiene, si no la de creación.
        fechaAsignada: data.fecha ?? ahora,
        creadaEn: ahora,
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

  // Núcleo de los cambios de estado. Actualiza `estado`, `completada` y
  // `estadoCambiadoEn`, persiste y, si la tarea es una instancia recurrente,
  // RECALCULA la racha de su recurrencia desde el historial (FIX #2), para
  // cualquier transición (done, inconcluso o revertir a todo/doing).
  //
  // FIX #3: en instancias recurrentes solo se permite cambiar de estado si la
  // instancia es de HOY. Las pasadas quedan congeladas; las futuras solo se
  // editan. (Las tareas no recurrentes no tienen esta restricción.)
  //
  // Lee de refs (no de closures) y escribe valores concretos para que sea
  // correcto bajo StrictMode (que invoca los updaters dos veces).
  const setEstado = useCallback(async (id: string, nuevoEstado: EstadoTarea) => {
    const tarea = tareasRef.current.find((t) => t.id === id)
    if (!tarea || tarea.estado === nuevoEstado) return

    if (tarea.recurrenciaId && tarea.fecha !== toYMD(new Date())) return

    const actualizada: Tarea = {
      ...tarea,
      estado: nuevoEstado,
      completada: nuevoEstado === 'done',
      estadoCambiadoEn: new Date().toISOString(),
    }
    await saveTarea(actualizada)
    const nuevasTareas = tareasRef.current.map((t) => (t.id === id ? actualizada : t))
    setTareas(nuevasTareas)

    // Recalcula la racha de la recurrencia desde el historial actualizado.
    if (tarea.recurrenciaId) {
      const rec = recurrenciasRef.current.find((r) => r.id === tarea.recurrenciaId)
      if (rec) {
        const actualizadaRec: Recurrencia = {
          ...rec,
          ...calcularRachas(tarea.recurrenciaId, nuevasTareas),
        }
        await saveRecurrencia(actualizadaRec)
        setRecurrencias((prev) =>
          prev.map((r) => (r.id === rec.id ? actualizadaRec : r))
        )
      }
    }
  }, [])

  // Alterna completada: si está completada vuelve a 'todo'; si no, pasa a 'done'.
  const toggleCompletada = useCallback(
    async (id: string) => {
      const tarea = tareasRef.current.find((t) => t.id === id)
      if (!tarea) return
      await setEstado(id, tarea.completada ? 'todo' : 'done')
    },
    [setEstado]
  )

  // Mueve una tarea a otra columna del Kanban (todo/doing/done).
  const moverEstado = useCallback(
    async (id: string, estado: EstadoTarea) => {
      await setEstado(id, estado)
    },
    [setEstado]
  )

  // Marca una tarea como inconclusa (estado terminal).
  const marcarInconcluso = useCallback(
    async (id: string) => {
      await setEstado(id, 'inconcluso')
    },
    [setEstado]
  )

  // Revierte cualquier estado terminal de vuelta a 'todo'.
  const revertirEstado = useCallback(
    async (id: string) => {
      await setEstado(id, 'todo')
    },
    [setEstado]
  )

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
        moverEstado,
        marcarInconcluso,
        revertirEstado,
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
