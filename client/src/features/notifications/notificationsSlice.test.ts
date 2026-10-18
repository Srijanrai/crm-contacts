import { makeStore } from '@/app/store'
import { dismiss, notify, selectVisibleNotifications } from './notificationsSlice'

describe('notifications slice', () => {
  it('shows only the three newest notifications', () => {
    const store = makeStore()
    for (const n of [1, 2, 3, 4]) store.dispatch(notify({ kind: 'info', message: `m${n}` }))
    expect(selectVisibleNotifications(store.getState()).map((n) => n.message)).toEqual(['m2', 'm3', 'm4'])
  })

  it('drops overflowed notifications instead of keeping them hidden for later', () => {
    const store = makeStore()
    for (const n of [1, 2, 3, 4]) store.dispatch(notify({ kind: 'info', message: `m${n}` }))
    expect(store.getState().notifications.items.map((n) => n.message)).toEqual(['m2', 'm3', 'm4'])
    store.dispatch(dismiss(store.getState().notifications.items[2].id))
    expect(selectVisibleNotifications(store.getState()).map((n) => n.message)).toEqual(['m2', 'm3'])
  })

  it('gives each notification a unique id and dismisses by id', () => {
    const store = makeStore()
    store.dispatch(notify({ kind: 'success', message: 'a' }))
    store.dispatch(notify({ kind: 'error', message: 'b' }))
    const [a, b] = selectVisibleNotifications(store.getState())
    expect(a.id).not.toBe(b.id)
    store.dispatch(dismiss(a.id))
    expect(selectVisibleNotifications(store.getState()).map((n) => n.message)).toEqual(['b'])
  })
})
