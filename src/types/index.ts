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
}

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
