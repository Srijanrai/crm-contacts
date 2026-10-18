export type Validated<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> }

/**
 * Collects field errors. Built with Object.fromEntries so a hostile key such as
 * "__proto__" becomes an ordinary own property instead of touching the prototype.
 */
export class FieldErrors {
  private entries: [string, string][] = []
  add(field: string, message: string) {
    this.entries.push([field, message])
  }
  get any() {
    return this.entries.length > 0
  }
  toObject(): Record<string, string> {
    return Object.fromEntries(this.entries)
  }
}

export const ok = <T>(value: T): Validated<T> => ({ ok: true, value })
export const fail = (errors: FieldErrors): Validated<never> => ({ ok: false, errors: errors.toObject() })
