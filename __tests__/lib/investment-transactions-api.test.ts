import {
  listTransactions, addTransaction, updateTransaction, deleteTransaction,
} from '@/lib/api/investment-transactions'

const mockFetch = (body: unknown, ok = true, status = 200) =>
  jest.fn().mockResolvedValue({ ok, status, json: async () => body } as Response)

const BASE = '/api/accounts/acc1/holdings/h1/transactions'

describe('investment-transactions api client', () => {
  afterEach(() => jest.restoreAllMocks())

  it('listTransactions GETs the ledger', async () => {
    global.fetch = mockFetch({ transactions: [{ id: 't1' }] })
    expect(await listTransactions('acc1', 'h1')).toEqual([{ id: 't1' }])
    expect(global.fetch).toHaveBeenCalledWith(BASE)
  })

  it('addTransaction POSTs and returns the row', async () => {
    global.fetch = mockFetch({ transaction: { id: 't2' } }, true, 201)
    const r = await addTransaction('acc1', 'h1', { type: 'BUY', quantity: 100, price_per_unit: 9000, transaction_date: '2026-06-01' })
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('POST')
    expect(r).toEqual({ id: 't2' })
  })

  it('updateTransaction PUTs to the txn id; deleteTransaction DELETEs', async () => {
    global.fetch = mockFetch({ transaction: { id: 't3' } })
    await updateTransaction('acc1', 'h1', 't3', { price_per_unit: 9500 })
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(`${BASE}/t3`)
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT')
    global.fetch = mockFetch({ success: true })
    await deleteTransaction('acc1', 'h1', 't3')
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE')
  })

  it('throws the server error on a non-ok response', async () => {
    global.fetch = mockFetch({ error: 'nope' }, false, 400)
    await expect(listTransactions('acc1', 'h1')).rejects.toThrow('nope')
  })
})
