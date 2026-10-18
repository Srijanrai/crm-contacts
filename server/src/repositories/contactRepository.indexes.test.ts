import mongoose from 'mongoose'
import { Contact } from '../models/Contact.js'
import { createContact } from '../test/factories.js'
import { contactRepository } from './contactRepository.js'

type Plan = { stage?: string; inputStage?: Plan; inputStages?: Plan[] }
const stages = (p: Plan | undefined): string[] =>
  p ? [p.stage ?? '', ...stages(p.inputStage), ...(p.inputStages ?? []).flatMap(stages)] : []

async function explainList(accountId: string, q: string) {
  const filter = contactRepository.listFilter(accountId, { q, tags: [], company: '', sort: '-createdAt', page: 1, limit: 20 }, null)
  const res = (await Contact.find(filter).sort({ createdAt: -1, _id: -1 }).limit(20).explain('executionStats')) as unknown as {
    queryPlanner: { winningPlan: Plan & { queryPlan?: Plan } }
    executionStats: { totalKeysExamined: number; totalDocsExamined: number }
  }
  const plan = res.queryPlanner.winningPlan.queryPlan ?? res.queryPlanner.winningPlan
  return { stages: stages(plan), stats: res.executionStats }
}

describe('search uses indexes (scale)', () => {
  it('answers a text search through index branches, not a scan of the whole account', async () => {
    const accountId = new mongoose.Types.ObjectId().toString()
    for (let i = 0; i < 60; i++) await createContact(accountId, { firstName: `Person${i}`, lastName: `Family${i}`, email: `p${i}@example.com` })
    const { stages: s, stats } = await explainList(accountId, 'zzz-nobody')
    expect(s).toContain('OR')
    expect(s).not.toContain('COLLSCAN')
    expect(stats.totalDocsExamined).toBe(0)
    expect(stats.totalKeysExamined).toBeLessThan(10)
  })

  it('keeps every search branch scoped to the account', () => {
    const filter = contactRepository.listFilter('a'.repeat(24), { q: '+44', tags: [], company: '', sort: 'name', page: 1, limit: 20 }, null)
    expect((filter.$or as { accountId?: string }[]).every((b) => b.accountId === 'a'.repeat(24))).toBe(true)
  })

  it('checks email uniqueness with an index lookup', async () => {
    const accountId = new mongoose.Types.ObjectId().toString()
    for (let i = 0; i < 60; i++) await createContact(accountId, { email: `p${i}@example.com` })
    const session = await mongoose.startSession()
    const filter = contactRepository.otherByEmailFilter(accountId, 'p5@example.com', new mongoose.Types.ObjectId().toString())
    const res = (await Contact.find(filter).session(session).explain('executionStats')) as unknown as {
      executionStats: { totalKeysExamined: number }
    }
    await session.endSession()
    expect(res.executionStats.totalKeysExamined).toBeLessThanOrEqual(2)
  })
})
