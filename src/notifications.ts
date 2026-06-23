import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Tarea } from './types'

const CHANNEL_ID = 'recordatorios'

// UUID -> entero positivo de 31 bits (los IDs de notificación son int de Java).
function notifId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 2147483647
}

// Combina fecha 'YYYY-MM-DD' + hora 'HH:MM' en una Date local.
function tareaDate(t: Tarea): Date | null {
  if (!t.fecha || !t.hora) return null
  const [y, m, d] = t.fecha.split('-').map(Number)
  const [hh, mm] = t.hora.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

async function ensurePermiso(): Promise<boolean> {
  let p = await LocalNotifications.checkPermissions()
  if (p.display !== 'granted') {
    p = await LocalNotifications.requestPermissions()
  }
  return p.display === 'granted'
}

// Pide permiso y crea el canal de alta importancia (aviso emergente).
export async function initNotificaciones(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await ensurePermiso()
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Recordatorios de tareas',
      description: 'Avisos a la hora de cada tarea',
      importance: 5, // MAX → notificación emergente (heads-up)
      visibility: 1,
      vibration: true,
    })
  } catch {
    // createChannel solo existe en Android; en otras plataformas se ignora.
  }
}

// Reprograma TODAS las notificaciones desde el estado actual de tareas:
// cancela las pendientes y agenda las tareas futuras con fecha+hora no completadas.
// Es idempotente: se puede llamar tras cualquier cambio sin generar duplicados.
export async function syncNotificaciones(tareas: Tarea[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (!(await ensurePermiso())) return

  const pendientes = await LocalNotifications.getPending()
  if (pendientes.notifications.length) {
    await LocalNotifications.cancel({
      notifications: pendientes.notifications.map((n) => ({ id: n.id })),
    })
  }

  const ahora = Date.now()
  const aProgramar = []
  for (const t of tareas) {
    // No notificar tareas terminales ni archivadas.
    if (t.completada || t.estado === 'inconcluso' || t.archivada) continue
    const at = tareaDate(t)
    if (!at || at.getTime() <= ahora) continue
    aProgramar.push({
      id: notifId(t.id),
      title: t.nombre,
      body: t.categoria ? `${t.categoria} · ${t.hora}` : `Recordatorio · ${t.hora}`,
      schedule: { at, allowWhileIdle: true },
      channelId: CHANNEL_ID,
      smallIcon: 'ic_stat_icon',
    })
  }

  if (aProgramar.length) {
    await LocalNotifications.schedule({ notifications: aProgramar })
  }
}
