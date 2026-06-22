import type { Categoria } from '../types'
import { CATEGORIA_COLORES } from '../types'

export default function EtiquetaCategoria({ categoria }: { categoria: Categoria }) {
  const c = CATEGORIA_COLORES[categoria]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {categoria}
    </span>
  )
}
