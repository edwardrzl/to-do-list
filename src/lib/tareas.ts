import type { Tarea } from '../types'

const MS_DIA = 86_400_000

// --- Helpers de fecha (compartidos entre vistas) ---

export function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Convierte 'YYYY-MM-DD' a Date local (sin desfase de zona horaria).
export function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Lunes de la semana de `date` (misma lógica que usa el Calendario).
export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// --- Contador de días pendientes (solo tareas NO recurrentes) ---

// Días que la tarea lleva sin completarse. El contador arranca el día
// SIGUIENTE a su fecha base (fecha asignada, o fecha de creación si no tiene).
// Solo corre mientras el estado sea 'todo' o 'doing'; en estados terminales
// o en instancias recurrentes devuelve 0 (no se muestra).
export function diasPendientes(tarea: Tarea, hoy: Date = new Date()): number {
  if (tarea.recurrenciaId) return 0
  if (tarea.estado !== 'todo' && tarea.estado !== 'doing') return 0
  const raw = tarea.fecha ?? tarea.fechaAsignada ?? tarea.creadaEn
  const base = ymdToDate(raw)
  const h = new Date(hoy)
  h.setHours(0, 0, 0, 0)
  const diff = Math.floor((h.getTime() - base.getTime()) / MS_DIA)
  return Math.max(0, diff)
}

export type BandaContador = 'gris' | 'ambar' | 'rojo'

export function bandaContador(dias: number): BandaContador | null {
  if (dias <= 0) return null
  if (dias <= 3) return 'gris'
  if (dias <= 7) return 'ambar'
  return 'rojo'
}
