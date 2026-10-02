// composables/useOfflineQueue.ts
import { openDB } from 'idb'
import type { CartItem } from '~/types/pos'

const DB_NAME = 'omk-pos-offline'
const STORE_NAME = 'pending-transactions'

export interface PendingTransaction {
  id:                string          // Local UUID
  company_id?:       string          // UUID Organisasi Asal
  timestamp:         string          // ISO string
  session_id:        string
  cashier_id:        string
  nominal_diterima:  number
  cart_items:        CartItem[]
  metode_pembayaran: 'cash' | 'qris'
  status:            'pending' | 'synced' | 'failed'
  error_message?:    string
}

export const useOfflineQueue = () => {
  const getDb = () => openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      if (oldVersion < 2 && typeof db.transaction === 'function') {
        try {
          const store = db.transaction(STORE_NAME, 'versionchange').objectStore(STORE_NAME)
          if (!store.indexNames.contains('by_company')) {
            store.createIndex('by_company', 'company_id', { unique: false })
          }
        } catch {
          // ignore index creation in mock/test environments
        }
      }
    }
  })

  const enqueue = async (transaction: Omit<PendingTransaction, 'status'>) => {
    const db = await getDb()
    await db.put(STORE_NAME, { ...transaction, status: 'pending' })
  }

  const getPending = async (companyId?: string): Promise<PendingTransaction[]> => {
    const db = await getDb()
    const all: PendingTransaction[] = await db.getAll(STORE_NAME)
    let filtered = (all || []).filter(t => t.status === 'pending')
    if (companyId) {
      filtered = filtered.filter(t => t.company_id === companyId)
    }
    return filtered.sort(
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
