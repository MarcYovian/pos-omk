import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from '~/stores/session'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.stubGlobal('getTodayJakarta', () => '2025-06-15')

const createQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
})

const mockRpc = vi.fn()

const mockFrom = vi.fn()

vi.stubGlobal('useSupabase', () => ({
  from: mockFrom,
  rpc: mockRpc,
}))

const makeSession = (overrides = {}): any => ({
  id: 'session-1',
  session_date: '2025-06-15',
  status: 'open',
  opened_by: 'user-1',
  closed_by: null,
  opened_at: '2025-06-15T08:00:00Z',
  closed_at: null,
  notes: null,
  created_at: '2025-06-15T08:00:00Z',
  ...overrides,
})

describe('useSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with default state', () => {
    const session = useSessionStore()
    expect(session.currentSession).toBeNull()
    expect(session.isOpen).toBe(false)
    expect(session.isClosed).toBe(false)
    expect(session.sessionId).toBeNull()
    expect(session.isLoading).toBe(false)
    expect(session.error).toBeNull()
  })

  describe('fetchTodaySession', () => {
    it('fetches and stores the session', async () => {
      const qb = createQueryBuilder()
      qb.maybeSingle.mockResolvedValue({ data: makeSession(), error: null })
      mockFrom.mockReturnValue(qb)

      const session = useSessionStore()
      await session.fetchTodaySession()

      expect(mockFrom).toHaveBeenCalledWith('sessions')
      expect(qb.select).toHaveBeenCalledWith('*')
      expect(qb.eq).toHaveBeenCalledWith('session_date', '2025-06-15')
      expect(session.currentSession).toEqual(makeSession())
      expect(session.isOpen).toBe(true)
      expect(session.sessionId).toBe('session-1')
      expect(session.isLoading).toBe(false)
    })

    it('sets currentSession to null when no session found', async () => {
      const qb = createQueryBuilder()
      qb.maybeSingle.mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue(qb)

      const session = useSessionStore()
      await session.fetchTodaySession()

      expect(session.currentSession).toBeNull()
      expect(session.isOpen).toBe(false)
    })

    it('throws on fetch error', async () => {
      const qb = createQueryBuilder()
      qb.maybeSingle.mockResolvedValue({ data: null, error: new Error('DB error') })
      mockFrom.mockReturnValue(qb)

      const session = useSessionStore()
      await expect(session.fetchTodaySession()).rejects.toThrow('DB error')
      expect(session.isLoading).toBe(false)
    })
  })

  describe('openSession', () => {
    it('opens a new session successfully', async () => {
      const qb = createQueryBuilder()
      const newSession = makeSession()
      qb.single.mockResolvedValue({ data: newSession, error: null })
      mockFrom.mockReturnValue(qb)

      const session = useSessionStore()
      const result = await session.openSession('user-1')

      expect(mockFrom).toHaveBeenCalledWith('sessions')
      expect(qb.insert).toHaveBeenCalledWith({
        session_date: '2025-06-15',
        opened_by: 'user-1',
        status: 'open',
      })
      expect(session.currentSession).toEqual(newSession)
      expect(result).toEqual(newSession)
    })

    it('throws on open error', async () => {
      const qb = createQueryBuilder()
      qb.single.mockResolvedValue({ data: null, error: new Error('Insert failed') })
      mockFrom.mockReturnValue(qb)

      const session = useSessionStore()
      await expect(session.openSession('user-1')).rejects.toThrow('Insert failed')
    })
  })

  describe('closeSession', () => {
    it('calls close_session RPC and refetches', async () => {
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      const qb = createQueryBuilder()
      qb.maybeSingle.mockResolvedValue({ data: makeSession({ status: 'closed' }), error: null })
      mockFrom.mockReturnValue(qb)

      const session = useSessionStore()
      session.currentSession = makeSession()

      await session.closeSession('admin-1')

      expect(mockRpc).toHaveBeenCalledWith('close_session', {
        p_session_id: 'session-1',
        p_admin_id: 'admin-1',
      })
      expect(session.currentSession?.status).toBe('closed')
    })

    it('throws when no active session to close', async () => {
      const session = useSessionStore()
      await expect(session.closeSession('admin-1')).rejects.toThrow('No active session to close.')
    })

    it('throws on RPC error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })

      const session = useSessionStore()
      session.currentSession = makeSession()

      await expect(session.closeSession('admin-1')).rejects.toThrow('RPC failed')
    })
  })
})
