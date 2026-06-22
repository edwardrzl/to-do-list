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
  _db = await openDB<TareasDB>('tareas-pwa', 3, {
    upgrade(db, oldVersion) {
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
