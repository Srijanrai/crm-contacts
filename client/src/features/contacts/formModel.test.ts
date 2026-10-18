import { makeContact } from '@/test/factories'
import { buildUpdate, dirtyFields, toFormValues } from './formModel'

describe('formModel', () => {
  const c = makeContact({ lastName: null, phone: null, version: 7 })

  it('maps nulls to empty strings for the form', () => {
    expect(toFormValues(c)).toMatchObject({ lastName: '', phone: '', firstName: c.firstName })
  })

  const base = { values: toFormValues(c), version: c.version }

  it('sends only the edited fields plus the version the edit started from', () => {
    expect(buildUpdate(base, { ...toFormValues(c), email: 'new@example.com' })).toEqual({ version: 7, email: 'new@example.com' })
  })

  it('compares against the edit base, not a newer copy of the contact', () => {
    const newer = { ...c, phone: '999 999 9999', version: 8 }
    expect(buildUpdate(base, { ...toFormValues(newer), phone: c.phone ?? '', email: 'new@example.com' })).toEqual({ version: 7, email: 'new@example.com' })
  })

  it('ignores whitespace-only changes', () => {
    expect(buildUpdate(base, { ...toFormValues(c), firstName: ` ${c.firstName} ` })).toBeNull()
    expect(dirtyFields(toFormValues(c), { ...toFormValues(c), company: `${c.company}  ` })).toEqual([])
  })

  it('treats clearing a field as a change', () => {
    expect(buildUpdate(base, { ...toFormValues(c), company: '' })).toEqual({ version: 7, company: '' })
  })
})
