import { makeStore } from '@/app/store'
import { recovered, selectIsSlow, slowStart } from './connectionSlice'

it('tracks a slow (cold) start until the server responds', () => {
  const store = makeStore()
  expect(selectIsSlow(store.getState())).toBe(false)
  store.dispatch(slowStart())
  expect(selectIsSlow(store.getState())).toBe(true)
  store.dispatch(recovered())
  expect(selectIsSlow(store.getState())).toBe(false)
})
