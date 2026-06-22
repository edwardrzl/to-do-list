export type Categoria =
  | 'Trabajo'
  | 'Personal'
  | 'Salud'
  | 'Estudio'
  | 'Recordatorio'
  | 'Otro'

export interface Tarea {
  id: string
  nombre: string
  categoria?: Categoria
  fecha?: string   // 'YYYY-MM-DD'
  hora?: string    // 'HH:MM'
  completada: boolean
  creadaEn: string // ISO timestamp
  recurrenciaId?: string | null // si tiene valor, es una instancia de una recurrencia
}

// dias usa la convención nativa de Date.getDay(): 0=Dom, 1=Lun, ... 6=Sáb
export interface Recurrencia {
  id: string
  nombre: string
  categoria?: Categoria
  hora?: string
  dias: number[]
  creadaEn: string
}

// Chips del modal en orden Lun..Dom, mapeados a valores de Date.getDay()
export const DIAS_SEMANA: { label: string; value: number }[] = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 },
]

export const CATEGORIAS: Categoria[] = [
  'Trabajo',
  'Personal',
  'Salud',
  'Estudio',
  'Recordatorio',
  'Otro',
]

export const CATEGORIA_COLORES: Record<Categoria, { bg: string; text: string; dot: string }> = {
  Trabajo:      { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  Personal:     { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  Salud:        { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  Estudio:      { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  Recordatorio: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  Otro:         { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
}
