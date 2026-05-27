import StandardCheck from './dice/standard-check.mjs'

/**
 * Handle an incoming socket event by dispatching to the appropriate dice-check or contest handler.
 * @param root0
 * @param root0.action
 * @param root0.data
 */
export function handleSocketEvent({ action = null, data = {} } = {}) {
  switch (action) {
    case 'diceCheck':
      return StandardCheck.handle(data)
    case 'diceContest':

    case 'diceGroupCheck':
  }
}
