import type { Request, Response } from 'express'
import { tagService } from '../services/tagService.js'
import type { BulkTagInput } from '../types/api.js'

export const tagController = {
  list: async (_req: Request, res: Response) => {
    res.json(await tagService.list(res.locals.accountId))
  },
  add: async (req: Request<{ id: string }>, res: Response) => {
    const { tag } = res.locals.input as { tag: string }
    res.json(await tagService.addToContact(res.locals.accountId, req.params.id, tag))
  },
  remove: async (req: Request<{ id: string; tag: string }>, res: Response) => {
    res.json(await tagService.removeFromContact(res.locals.accountId, req.params.id, req.params.tag))
  },
  bulk: async (_req: Request, res: Response) => {
    res.json(await tagService.bulkAssign(res.locals.accountId, res.locals.input as BulkTagInput))
  },
}
