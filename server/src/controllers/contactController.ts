import type { Request, Response } from 'express'
import { contactService } from '../services/contactService.js'
import type { ListQuery } from '../types/api.js'
import type { UpdateInput } from '../types/domain.js'

/** HTTP in/out only: read validated input, call one service method, send the result. */
export const contactController = {
  list: async (_req: Request, res: Response) => {
    res.json(await contactService.list(res.locals.accountId, res.locals.input as ListQuery))
  },
  get: async (req: Request<{ id: string }>, res: Response) => {
    res.json(await contactService.get(res.locals.accountId, req.params.id))
  },
  update: async (req: Request<{ id: string }>, res: Response) => {
    res.json(await contactService.update(res.locals.accountId, req.params.id, res.locals.input as UpdateInput))
  },
}
