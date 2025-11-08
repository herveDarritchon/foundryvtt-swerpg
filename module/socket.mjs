import StandardCheck from './dice/standard-check.mjs'

/**
 *
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
