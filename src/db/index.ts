import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Tarea } from '../types'

interface TareasDB extends DBSchema {
  tareas: {
    key: string
    value: Tarea
    indexes: { 'by-fecha': string }
  }
}

let _db: IDBPDatabase<TareasDB> | null = null

async function getDB(): Promise<IDBPDatabase<TareasDB>> {
  if (_db) return _db
  _db = await openDB<TareasDB>('tareas-pwa', 1, {
    upgrade(db) {
      const store = db.createObjectStore('tareas', { keyPath: 'id' })
      store.createIndex('by-fecha', 'fecha')
    },
  })
  return _db
}

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
