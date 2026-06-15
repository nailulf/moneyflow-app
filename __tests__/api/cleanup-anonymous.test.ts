/**
 * @jest-environment node
 */
const listUsers = jest.fn()
const deleteUser = jest.fn()
jest.mock('@/lib/supabase', () => ({
  createServerComponentClient: () => ({ auth: { admin: { listUsers, deleteUser } } }),
}))
import { POST } from '@/app/api/admin/cleanup-anonymous/route'
const req = (auth?: string) =>
  new Request('http://x', { method: 'POST', headers: auth ? { authorization: auth } : {} }) as never

describe('POST /api/admin/cleanup-anonymous', () => {
  const OLD = process.env.CRON_SECRET
  beforeEach(() => { jest.clearAllMocks(); process.env.CRON_SECRET = 'secret' })
  afterAll(() => { process.env.CRON_SECRET = OLD })

  it('401s without the cron secret', async () => {
    expect((await POST(req())).status).toBe(401)
  })

  it('deletes only anonymous users older than the cutoff', async () => {
    const old = '2000-01-01T00:00:00Z'
    const recent = new Date().toISOString()
    listUsers.mockResolvedValue({ data: { users: [
      { id: 'a', is_anonymous: true, created_at: old },
      { id: 'b', is_anonymous: true, created_at: recent },
      { id: 'c', is_anonymous: false, created_at: old },
    ] }, error: null })
    deleteUser.mockResolvedValue({ error: null })
    const res = await POST(req('Bearer secret'))
    expect(res.status).toBe(200)
    expect(deleteUser).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith('a')
  })
})
