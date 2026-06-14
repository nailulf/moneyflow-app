import { listHoldings, createHolding, updateHolding, deleteHolding } from '@/lib/api/holdings'

const mockFetch = (body: unknown, ok = true, status = 200) =>
  jest.fn().mockResolvedValue({ ok, status, json: async () => body } as Response)

describe('holdings api client', () => {
  afterEach(() => jest.restoreAllMocks())

  it('listHoldings GETs the account holdings and returns the array', async () => {
    global.fetch = mockFetch({ holdings: [{ id: 'h1' }] })
    const r = await listHoldings('acc1')
    expect(global.fetch).toHaveBeenCalledWith('/api/accounts/acc1/holdings')
    expect(r).toEqual([{ id: 'h1' }])
  })

  it('createHolding POSTs the payload and returns the holding', async () => {
    global.fetch = mockFetch({ holding: { id: 'h2' } }, true, 201)
    const r = await createHolding('acc1', { asset_class: 'IDX_STOCK', name: 'BBCA', quantity: 100, purchase_price: 9000, current_value: 990000 })
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('/api/accounts/acc1/holdings')
    expect(init.method).toBe('POST')
    expect(r).toEqual({ id: 'h2' })
  })

  it('updateHolding PUTs to the holding id; deleteHolding DELETEs', async () => {
    global.fetch = mockFetch({ holding: { id: 'h3' } })
    await updateHolding('acc1', 'h3', { current_value: 1 })
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/accounts/acc1/holdings/h3')
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT')
    global.fetch = mockFetch({ success: true })
    await deleteHolding('acc1', 'h3')
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE')
  })

  it('throws on a non-ok response with the server error', async () => {
    global.fetch = mockFetch({ error: 'nope' }, false, 400)
    await expect(listHoldings('acc1')).rejects.toThrow('nope')
  })
})
