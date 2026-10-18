import { Router } from 'express'
import { activityController } from '../controllers/activityController.js'
import { contactController } from '../controllers/contactController.js'
import { tagController } from '../controllers/tagController.js'
import { validate, validateParamId } from '../middleware/validate.js'
import { validateActivityQuery } from '../validators/activityQuery.js'
import { validateContactPatch } from '../validators/contact.js'
import { validateListQuery } from '../validators/listQuery.js'
import { validateBulkTagBody, validateTagBody } from '../validators/tag.js'

export function contactsRouter(): Router {
  const router = Router()
  router.get('/', validate(validateListQuery, 'query'), contactController.list)
  // Before the /:id routes, so "bulk" is never read as a contact id.
  router.post('/bulk/tags', validate(validateBulkTagBody, 'body'), tagController.bulk)
  router.get('/:id', validateParamId(), contactController.get)
  router.patch('/:id', validateParamId(), validate(validateContactPatch, 'body'), contactController.update)
  router.post('/:id/tags', validateParamId(), validate(validateTagBody, 'body'), tagController.add)
  router.delete('/:id/tags/:tag', validateParamId(), tagController.remove)
  router.get('/:id/activity', validateParamId(), validate(validateActivityQuery, 'query'), activityController.list)
  return router
}
