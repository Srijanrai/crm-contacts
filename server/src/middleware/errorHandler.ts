import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../errors/AppError.js'

const isDuplicateEmail = (err: unknown) => {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> }
  return e?.code === 11000 && Boolean(e.keyPattern && 'email' in e.keyPattern)
}

const isClientError = (err: unknown) => {
  const e = err as { status?: unknown; statusCode?: unknown }
  const status = typeof e?.status === 'number' ? e.status : e?.statusCode
  return typeof status === 'number' && status >= 400 && status < 500
}

/** Maps every failure to the API error body. Unknown errors are logged and hidden behind INTERNAL. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error: AppError
  if (err instanceof AppError) error = err
  else if (err?.type === 'entity.parse.failed') error = AppError.validation({ body: 'Malformed JSON' })
  else if (err?.type === 'entity.too.large') {
    error = new AppError(413, 'VALIDATION_ERROR', 'Request body is too large')
  }
  // A racing writer won the unique email index between our pre-check and our write.
  else if (isDuplicateEmail(err)) error = AppError.emailTaken()
  // Other client errors raised by Express or the body parser (malformed %-encoding in the path,
  // a body that isn't really gzip, an unsupported Content-Encoding): the request is at fault, not us.
  else if (isClientError(err)) {
    error =
      err.status === 415
        ? new AppError(415, 'VALIDATION_ERROR', 'Unsupported content encoding')
        : new AppError(400, 'VALIDATION_ERROR', 'Invalid request')
  }
  else {
    console.error(err)
    error = AppError.internal()
  }
  const { code, message, fields, details } = error
  res.status(error.status).json({ error: { code, message, ...(fields && { fields }), ...(details && { details }) } })
}

export const notFound: RequestHandler = () => {
  throw new AppError(404, 'NOT_FOUND', 'Route not found')
}
