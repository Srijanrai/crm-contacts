declare global {
  namespace Express {
    interface Locals {
      /** Set by the account middleware; every repository call is scoped by it. */
      accountId: string
      /** Validated input, set by the validate middleware. */
      input: unknown
    }
  }
}

export {}
