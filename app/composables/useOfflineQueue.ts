// composables/useOfflineQueue.ts
import { openDB } from 'idb'
import type { CartItem } from '~/types/pos'

const DB_NAME = 'omk-pos-offline'
const STORE_NAME = 'pending-transactions'

export interface PendingTransaction {
  id:                string          // Local UUID
  timestamp:         string          // ISO string
  session_id:        string
  cashier_id:        string
  nominal_diterima:  number
  cart_items:        CartItem[]
  status:            'pending' | 'synced' | 'failed'
  error_message?:    string
}

export const useOfflineQueue = () => {
  const getDb = () => openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
  })

  const enqueue = async (transaction: Omit<PendingTransaction, 'status'>) => {
    const db = await getDb()
    await db.put(STORE_NAME, { ...transaction, status: 'pending' })
  }

  const getPending = async (): Promise<PendingTransaction[]> => {
    const db = await getDb()
    const all = await db.getAll(STORE_NAME)
    return all.filter(t => t.status === 'pending').sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }

  const markSynced = async (id: string) => {
    const db = await getDb()
    const record = await db.get(STORE_NAME, id)
    if (record) await db.put(STORE_NAME, { ...record, status: 'synced' })
  }

  const markFailed = async (id: string, errorMessage: string) => {
    const db = await getDb()
    const record = await db.get(STORE_NAME, id)
    if (record) await db.put(STORE_NAME, { ...record, status: 'failed', error_message: errorMessage })
  }

  return { enqueue, getPending, markSynced, markFailed }
}
