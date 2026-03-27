/**
 * Shared Supabase mock helper for API route tests.
 *
 * Usage:
 *   import { createMockSupabase, type MockSupabase } from '../helpers/mock-supabase';
 *   const mockSupabase = createMockSupabase();
 *   vi.mock('@/lib/supabase/server', () => ({
 *     createAdminClient: vi.fn(() => mockSupabase),
 *     createServerSupabaseClient: vi.fn(() => mockSupabase),
 *   }));
 *
 * Then in individual tests:
 *   mockSupabase.__setResponse({ data: [...], error: null });
 *   // or per-table:
 *   mockSupabase.__setResponseForTable('tee_times', { data: [...], error: null });
 */

import { vi } from 'vitest';

export interface QueryResponse<T = unknown> {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
}

export interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  /** Set the response that will be returned for ALL queries */
  __setResponse(response: QueryResponse): void;
  /** Set responses keyed by table name (takes precedence over the global response) */
  __setResponseForTable(table: string, response: QueryResponse): void;
  /** Reset stored responses and re-apply the base from() implementation */
  __reset(): void;
}

/**
 * Build a thenable chain object that resolves to `getResponse()`.
 * Each method returns itself for fluent-API chaining.
 * The object is also a thenable so `await chain` works.
 */
function buildChain(getResponse: () => QueryResponse): Record<string, unknown> {
  const chain: Record<string, unknown> = {};

  // All filter/modifier methods just return the chain for chaining
  for (const method of [
    'select', 'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt',
    'order', 'limit', 'insert', 'update', 'delete', 'upsert',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods that resolve a response
  chain.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(getResponse()));
  chain.single = vi.fn().mockImplementation(() => Promise.resolve(getResponse()));

  // Make the chain thenable so `await supabase.from(...).select(...)...`
  // resolves correctly without needing an explicit terminal call.
  chain.then = (
    resolve: (r: QueryResponse) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(getResponse()).then(resolve, reject);

  return chain;
}

/** Install the base implementation on the given `from` spy. */
function installFromImpl(
  from: ReturnType<typeof vi.fn>,
  tableResponses: Map<string, QueryResponse>,
  getGlobalResponse: () => QueryResponse,
) {
  from.mockImplementation((table: string) => {
    const getResponse = () =>
      tableResponses.has(table)
        ? (tableResponses.get(table) as QueryResponse)
        : getGlobalResponse();

    return buildChain(getResponse);
  });
}

export function createMockSupabase(): MockSupabase {
  let globalResponse: QueryResponse = { data: [], error: null };
  const tableResponses = new Map<string, QueryResponse>();

  const from = vi.fn();
  installFromImpl(from, tableResponses, () => globalResponse);

  const mockSupabase: MockSupabase = {
    from,

    __setResponse(response: QueryResponse) {
      globalResponse = response;
    },

    __setResponseForTable(table: string, response: QueryResponse) {
      tableResponses.set(table, response);
    },

    __reset() {
      globalResponse = { data: [], error: null };
      tableResponses.clear();
      // Re-install the base implementation after clearing (vi.clearAllMocks()
      // called externally resets mock state, so we must restore the impl here).
      installFromImpl(from, tableResponses, () => globalResponse);
    },
  };

  return mockSupabase;
}
