import type { Request, Response } from 'express'
import { activityService } from '../services/activityService.js'

export const activityController = {
  list: async (req: Request<{ id: string }>, res: Response) => {
    res.json(await activityService.list(res.locals.accountId, req.params.id, res.locals.input as { limit: number; before?: string }))
  },
}
