import type { RequestHandler } from 'express'
import { AppError } from '../errors/AppError.js'
import { isObjectId } from '../validators/common.js'
import type { Validated } from '../validators/result.js'

/** Runs a pure validator on the body or query; the cleaned value lands in res.locals.input. */
export function validate<T>(fn: (input: Record<string, unknown>) => Validated<T>, source: 'body' | 'query'): RequestHandler {
  return (req, res, next) => {
    const raw = source === 'body' ? req.body : req.query
    const result = fn(raw as Record<string, unknown>)
    if (!result.ok) throw AppError.validation(result.errors)
    res.locals.input = result.value
    next()
  }
}

export function validateParamId(name = 'id'): RequestHandler {
  return (req, _res, next) => {
    if (!isObjectId(req.params[name])) throw AppError.invalidId()
    next()
  }
}
