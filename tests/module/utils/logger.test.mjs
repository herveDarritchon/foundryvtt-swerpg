import { describe, it, expect, beforeEach, vi } from 'vitest'
import { logger } from '../../../module/utils/logger.mjs'

function mockConsole() {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'debug').mockImplementation(() => {})
  vi.spyOn(console, 'group').mockImplementation(() => {})
  vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  vi.spyOn(console, 'table').mockImplementation(() => {})
  vi.spyOn(console, 'time').mockImplementation(() => {})
  vi.spyOn(console, 'timeEnd').mockImplementation(() => {})
  vi.spyOn(console, 'trace').mockImplementation(() => {})
  vi.spyOn(console, 'assert').mockImplementation(() => {})
}

describe('logger (sans debug)', () => {
  beforeEach(() => {
    logger.disableDebug()
    mockConsole()
  })

  it('ignore log/info/debug/group/table/time/trace quand debug OFF', () => {
    logger.log('a')
    logger.info('b')
    logger.debug('c')
    logger.group('grp')
    logger.groupCollapsed('grpC')
    logger.groupEnd()
    logger.table(['x'])
    logger.time('t')
    logger.timeEnd('t')
    logger.trace('trace')
    expect(console.log).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
    expect(console.debug).not.toHaveBeenCalled()
    expect(console.group).not.toHaveBeenCalled()
    expect(console.groupCollapsed).not.toHaveBeenCalled()
    expect(console.groupEnd).not.toHaveBeenCalled()
    expect(console.table).not.toHaveBeenCalled()
    expect(console.time).not.toHaveBeenCalled()
    expect(console.timeEnd).not.toHaveBeenCalled()
    expect(console.trace).not.toHaveBeenCalled()
  })

  it('warn et error passent toujours', () => {
    logger.warn('attention')
    logger.error('erreur')
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('assert ne log pas si condition vraie', () => {
    logger.assert(true, 'ok')
    expect(console.assert).not.toHaveBeenCalled()
  })

  it('assert ne log pas condition fausse sans debug', () => {
    logger.assert(false, 'ko')
    expect(console.assert).not.toHaveBeenCalled()
  })
})

describe('logger (debug ON)', () => {
  beforeEach(() => {
    logger.enableDebug()
    mockConsole()
  })

  it('toutes les méthodes log avec debug', () => {
    logger.log('log')
    logger.info('info')
    logger.debug('debug')
    logger.group('group')
    logger.groupCollapsed('groupC')
    logger.groupEnd()
    logger.table(['t'])
    logger.time('x')
    logger.timeEnd('x')
    logger.trace('trace')
    logger.warn('warn')
    logger.error('error')
    logger.assert(false, 'assert')
    expect(console.log).toHaveBeenCalled()
    expect(console.info).toHaveBeenCalled()
    expect(console.debug).toHaveBeenCalled()
    expect(console.group).toHaveBeenCalled()
    expect(console.groupCollapsed).toHaveBeenCalled()
    expect(console.groupEnd).toHaveBeenCalled()
    expect(console.table).toHaveBeenCalled()
    expect(console.time).toHaveBeenCalled()
    expect(console.timeEnd).toHaveBeenCalled()
    expect(console.trace).toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
    expect(console.assert).toHaveBeenCalled()
  })

  it('setDebug(false) coupe le mode debug', () => {
    logger.setDebug(false)
    expect(logger.isDebugEnabled()).toBe(false)
  })
})
