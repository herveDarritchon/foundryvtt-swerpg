import { describe, it, expect, vi } from 'vitest'
import { handleSocketEvent } from '../../module/socket.mjs'
import StandardCheck from '../../module/dice/standard-check.mjs'

describe('handleSocketEvent', () => {
  it('appelle StandardCheck.handle pour action diceCheck', () => {
    const spy = vi.spyOn(StandardCheck, 'handle').mockReturnValue('ok')
    const result = handleSocketEvent({ action: 'diceCheck', data: { foo: 'bar' } })
    expect(spy).toHaveBeenCalledWith({ foo: 'bar' })
    expect(result).toBe('ok')
  })

  it('retourne undefined pour action inconnue', () => {
    const result = handleSocketEvent({ action: 'other', data: {} })
    expect(result).toBeUndefined()
  })
})
