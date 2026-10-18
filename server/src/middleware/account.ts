import type { RequestHandler } from 'express'
import type { Env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'
import { accountRepository } from '../repositories/accountRepository.js'
import { isObjectId } from '../validators/common.js'

/**
 * Resolves the tenant for the request. There is no auth in this demo: the account comes from
 * DEFAULT_ACCOUNT_ID, or an X-Account-Id header (for testing). Real auth would supply it here.
 */
export function account(env: Env): RequestHandler {
  const known = new Set<string>()
  return async (req, res, next) => {
    const header = req.get('X-Account-Id')
    const id = (header ?? env.defaultAccountId).toLowerCase()
    if (!isObjectId(id)) throw AppError.invalidId('account')
    if (!known.has(id)) {
      if (!(await accountRepository.exists(id))) throw AppError.notFound('Account')
      known.add(id)
    }
    res.locals.accountId = id
    next()
  }
}
