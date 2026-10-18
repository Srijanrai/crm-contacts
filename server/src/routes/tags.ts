import { Router } from 'express'
import { tagController } from '../controllers/tagController.js'

export const tagsRouter = (): Router => Router().get('/', tagController.list)
