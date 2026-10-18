import { Router } from 'express'
import { contactsRouter } from './contacts.js'
import { tagsRouter } from './tags.js'

/** Account-scoped API routes (mounted after the account middleware). */
export function apiRouter(): Router {
  const router = Router()
  router.use('/contacts', contactsRouter())
  router.use('/tags', tagsRouter())
  return router
}
