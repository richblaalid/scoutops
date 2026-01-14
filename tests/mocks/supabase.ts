import { vi } from 'vitest'

/**
 * Mock result type for Supabase queries
 */
export interface MockQueryResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

/**
 * Creates a chainable mock query builder for Supabase
 */
export function createMockQueryBuilder<T>(result: MockQueryResult<T>) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: vi.fn((resolve) => resolve(result)),
  }

  // Make all methods return the builder for chaining
  Object.keys(builder).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
      (builder as Record<string, unknown>)[key] = vi.fn().mockReturnValue(builder)
    }
  })

  return builder
}

/**
 * Creates a mock Supabase client
 */
export function createMockSupabaseClient(overrides: {
  fromResults?: Record<string, MockQueryResult<unknown>>
  rpcResults?: Record<string, MockQueryResult<unknown>>
  authUser?: { id: string; email: string } | null
} = {}) {
  const { fromResults = {}, rpcResults = {}, authUser = null } = overrides

  const client = {
    from: vi.fn((table: string) => {
      const result = fromResults[table] || { data: null, error: null }
      return createMockQueryBuilder(result)
    }),
    rpc: vi.fn((fnName: string, params?: Record<string, unknown>) => {
      const result = rpcResults[fnName] || { data: null, error: null }
      return Promise.resolve(result)
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: authUser ? { user: authUser } : null },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
        remove: vi.fn(),
      }),
    },
  }

  return client
}

/**
 * Creates a mock service client (bypasses RLS)
 */
export function createMockServiceClient(overrides: {
  fromResults?: Record<string, MockQueryResult<unknown>>
  rpcResults?: Record<string, MockQueryResult<unknown>>
} = {}) {
  return createMockSupabaseClient(overrides)
}

/**
 * Helper to create successful query result
 */
export function mockSuccess<T>(data: T): MockQueryResult<T> {
  return { data, error: null }
}

/**
 * Helper to create error query result
 */
export function mockError(message: string, code?: string): MockQueryResult<never> {
  return { data: null, error: { message, code } }
}

/**
 * Helper to create not found result
 */
export function mockNotFound(): MockQueryResult<never> {
  return { data: null, error: { message: 'Not found', code: 'PGRST116' } }
}
