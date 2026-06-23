import { useState, useEffect } from 'react'
import type { Tarea, Recurrencia } from '../types'
import { useTareas } from '../context/TareasContext'
import EtiquetaCategoria from '../components/EtiquetaCategoria'
import IndicadorTarea from '../components/IndicadorTarea'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

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

interface DayColumnProps {
  date: Date
  tareas: Tarea[]
  recurrencias: Recurrencia[]
  isToday: boolean
  onEdit: (t: Tarea) => void
}

function DayColumn({ date, tareas, recurrencias, isToday, onEdit }: DayColumnProps) {
  const dayIdx = (date.getDay() + 6) % 7
  const dayName = DIAS[dayIdx]
  const dayNum = date.getDate()

  const sorted = [...tareas].sort((a, b) => {
    if (a.hora && b.hora) return a.hora.localeCompare(b.hora)
    if (a.hora) return -1
    if (b.hora) return 1
    return 0
  })

  return (
    <div className={`rounded-xl border ${isToday ? 'border-indigo-300 bg-indigo-50/60' : 'border-gray-100 bg-white'} p-3 mb-3 shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl ${isToday ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <span className="text-xs font-medium leading-none">{dayName}</span>
          <span className="text-base font-bold leading-tight">{dayNum}</span>
        </div>
        <span className="text-xs text-gray-400">{tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-300 italic pl-1">Sin tareas</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((t) => {
            const inconclusa = t.estado === 'inconcluso'
            const terminal = t.completada || inconclusa
            return (
            <button
              key={t.id}
              onClick={() => onEdit(t)}
              className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${terminal ? 'opacity-50' : 'hover:bg-white/80'}`}
            >
              {/* Indicador de estado (solo lectura — el Calendario no cambia estados) */}
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: t.completada ? '#6366f1' : inconclusa ? '#9ca3af' : '#d1d5db',
                  backgroundColor: t.completada ? '#6366f1' : inconclusa ? '#9ca3af' : 'white',
                }}
              >
                {t.completada && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {inconclusa && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                  </svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-1 text-sm ${terminal ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                  <IndicadorTarea tarea={t} recurrencias={recurrencias} />
                  {t.hora && <span className="text-indigo-500 font-semibold mr-0.5">{t.hora}</span>}
                  <span className="truncate">{t.nombre}</span>
                  {t.recurrenciaId && !terminal && (
                    <svg className="flex-shrink-0 text-indigo-400" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                  )}
                </div>
                {t.categoria && !terminal && (
                  <div className="mt-0.5">
                    <EtiquetaCategoria categoria={t.categoria} />
                  </div>
                )}
              </div>
            </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Calendario({ onEdit }: { onEdit: (t: Tarea) => void }) {
  const { tareas, recurrencias, generarInstanciasParaSemana } = useTareas()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  const today = toYMD(new Date())

  // Genera las instancias recurrentes de la semana visible (al montar y al navegar)
  useEffect(() => {
    generarInstanciasParaSemana(weekStart)
  }, [weekStart, generarInstanciasParaSemana])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = days[6]

  const tareasPorDia = days.map((d) => {
    const ymd = toYMD(d)
    return tareas.filter((t) => t.fecha === ymd && !t.archivada)
  })

  const mesInicio = MESES[weekStart.getMonth()]
  const mesFin = MESES[weekEnd.getMonth()]
  const anio = weekStart.getFullYear()
  const titulo =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${mesInicio} ${anio}`
      : `${mesInicio} – ${mesFin} ${anio}`

  function prevWeek() {
    setWeekStart((w) => addDays(w, -7))
  }
  function nextWeek() {
    setWeekStart((w) => addDays(w, 7))
  }
  function goToday() {
    setWeekStart(getMonday(new Date()))
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <button onClick={goToday} className="text-center">
            <div className="text-sm font-semibold text-gray-800">{titulo}</div>
            <div className="text-xs text-indigo-500">
              {days[0].getDate()} – {days[6].getDate()}
            </div>
          </button>

          <button onClick={nextWeek} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 pt-3">
        {days.map((d, i) => (
          <DayColumn
            key={toYMD(d)}
            date={d}
            tareas={tareasPorDia[i]}
            recurrencias={recurrencias}
            isToday={toYMD(d) === today}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  )
}
