import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase, IDBPDatabase as RawIDBPDatabase } from 'idb'
import type { Tarea, Recurrencia } from '../types'

interface TareasDB extends DBSchema {
  tareas: {
    key: string
    value: Tarea
    indexes: { 'by-fecha': string }
  }
  recurrencias: {
    key: string
    value: Recurrencia
  }
}

let _db: IDBPDatabase<TareasDB> | null = null

async function getDB(): Promise<IDBPDatabase<TareasDB>> {
  if (_db) return _db
  _db = await openDB<TareasDB>('tareas-pwa', 6, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const store = db.createObjectStore('tareas', { keyPath: 'id' })
        store.createIndex('by-fecha', 'fecha')
      }
      // 'reglas' fue un store provisional de una iteración anterior; se descarta.
      // El schema tipado ya no lo declara, así que accedemos sin tipos.
      const rawDb = db as unknown as RawIDBPDatabase
      if (rawDb.objectStoreNames.contains('reglas')) {
        rawDb.deleteObjectStore('reglas')
      }
      if (!db.objectStoreNames.contains('recurrencias')) {
        db.createObjectStore('recurrencias', { keyPath: 'id' })
      }
      // v4: agrega `estado` al modelo de tarea. Las tareas existentes se
      // clasifican según `completada` (done si está completada, todo si no).
      // v5: agrega `estadoCambiadoEn`, `archivada` y `fechaAsignada` a tareas, y
      // las rachas a recurrencias. Migración defensiva con valores por defecto.
      if (oldVersion < 5) {
        const store = tx.objectStore('tareas')
        let cursor = await store.openCursor()
        while (cursor) {
          const t = cursor.value as Tarea
          let dirty = false
          if (!t.estado) {
            t.estado = t.completada ? 'done' : 'todo'
            dirty = true
          }
          if (!t.estadoCambiadoEn) {
            t.estadoCambiadoEn = t.creadaEn
            dirty = true
          }
          if (t.archivada === undefined) {
            t.archivada = false
            dirty = true
          }
          if (!t.fechaAsignada) {
            // base del contador: la fecha si la tiene, si no la de creación.
            t.fechaAsignada = t.fecha ?? t.creadaEn
            dirty = true
          }
          if (dirty) await cursor.update(t)
          cursor = await cursor.continue()
        }

        const recStore = tx.objectStore('recurrencias')
        let recCursor = await recStore.openCursor()
        while (recCursor) {
          const r = recCursor.value as Recurrencia
          let dirty = false
          if (r.rachaActual === undefined) { r.rachaActual = 0; dirty = true }
          if (r.rachaInconclusa === undefined) { r.rachaInconclusa = 0; dirty = true }
          if (dirty) await recCursor.update(r)
          recCursor = await recCursor.continue()
        }
      }

      // v6: renombra categorías existentes. 'Salud' → 'Citas',
      // 'Recordatorio' → 'Compras'. Sin esto, las tareas guardadas con el
      // nombre viejo perderían su color (lookup undefined en CATEGORIA_COLORES).
      if (oldVersion < 6) {
        const RENOMBRES: Record<string, string> = {
          Salud: 'Citas',
          Recordatorio: 'Compras',
        }
        for (const storeName of ['tareas', 'recurrencias'] as const) {
          const store = tx.objectStore(storeName)
          let cursor = await store.openCursor()
          while (cursor) {
            const item = cursor.value as { categoria?: string }
            const nuevo = item.categoria && RENOMBRES[item.categoria]
            if (nuevo) {
              await cursor.update({ ...item, categoria: nuevo })
            }
            cursor = await cursor.continue()
          }
        }
      }
    },
  })
  return _db
}

// --- Tareas ---

export async function getAllTareas(): Promise<Tarea[]> {
  const db = await getDB()
  return db.getAll('tareas')
}

export async function saveTarea(tarea: Tarea): Promise<void> {
  const db = await getDB()
  await db.put('tareas', tarea)
}

export async function deleteTarea(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tareas', id)
}

// --- Recurrencias ---

export async function getAllRecurrencias(): Promise<Recurrencia[]> {
  const db = await getDB()
  return db.getAll('recurrencias')
}

export async function saveRecurrencia(recurrencia: Recurrencia): Promise<void> {
  const db = await getDB()
  await db.put('recurrencias', recurrencia)
}

export async function deleteRecurrencia(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('recurrencias', id)
}

// Pide al navegador marcar el almacenamiento como "persistente": evita que
// Android/Chrome desaloje la base de IndexedDB por presión de espacio.
// Devuelve true si quedó persistente (ya lo estaba o se concedió).
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
