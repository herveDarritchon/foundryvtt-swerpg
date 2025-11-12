import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../../module/utils/logger.mjs'

describe('Logger Utils', () => {
  // Mock console methods to avoid actual console output during tests
  const consoleMocks = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    group: vi.fn(),
    groupCollapsed: vi.fn(),
    groupEnd: vi.fn(),
    table: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
    trace: vi.fn(),
    assert: vi.fn(),
  }

  beforeEach(() => {
    // Reset debug state to default
    logger.disableDebug()

    // Mock all console methods
    for (const method of Object.keys(consoleMocks)) {
      consoleMocks[method].mockClear()
      vi.spyOn(console, method).mockImplementation(consoleMocks[method])
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Debug State Management', () => {
    test('should start with debug disabled by default', () => {
      expect(logger.isDebugEnabled()).toBe(false)
    })

    test('should enable debug when enableDebug is called', () => {
      logger.enableDebug()
      expect(logger.isDebugEnabled()).toBe(true)
    })

    test('should disable debug when disableDebug is called', () => {
      logger.enableDebug()
      logger.disableDebug()
      expect(logger.isDebugEnabled()).toBe(false)
    })

    describe('setDebug method', () => {
      test('should set debug to true when passed truthy value', () => {
        logger.setDebug(true)
        expect(logger.isDebugEnabled()).toBe(true)
      })

      test('should set debug to false when passed falsy value', () => {
        logger.setDebug(false)
        expect(logger.isDebugEnabled()).toBe(false)

        logger.setDebug(0)
        expect(logger.isDebugEnabled()).toBe(false)

        logger.setDebug('')
        expect(logger.isDebugEnabled()).toBe(false)

        logger.setDebug(null)
        expect(logger.isDebugEnabled()).toBe(false)
      })
    })
  })

  describe('Logging Methods - Debug Disabled', () => {
    beforeEach(() => {
      logger.disableDebug()
    })

    test('should always log error messages', () => {
      logger.error('test error', 'additional data')
      expect(consoleMocks.error).toHaveBeenCalledWith('SWERPG ||', 'test error', 'additional data')
    })

    test('should always log warn messages', () => {
      logger.warn('test warning', 'additional data')
      expect(consoleMocks.warn).toHaveBeenCalledWith('SWERPG ||', 'test warning', 'additional data')
    })

    test('should not log info messages when debug is disabled', () => {
      logger.info('test info')
      expect(consoleMocks.info).not.toHaveBeenCalled()
    })

    test('should not log debug messages when debug is disabled', () => {
      logger.debug('test debug')
      expect(consoleMocks.debug).not.toHaveBeenCalled()
    })

    test('should not log general log messages when debug is disabled', () => {
      logger.log('test log')
      expect(consoleMocks.log).not.toHaveBeenCalled()
    })
  })

  describe('Logging Methods - Debug Enabled', () => {
    beforeEach(() => {
      logger.enableDebug()
    })

    test('should log all message types when debug is enabled', () => {
      logger.log('test log')
      logger.info('test info')
      logger.warn('test warn')
      logger.error('test error')
      logger.debug('test debug')

      expect(consoleMocks.log).toHaveBeenCalledWith('SWERPG ||', 'test log')
      expect(consoleMocks.info).toHaveBeenCalledWith('SWERPG ||', 'test info')
      expect(consoleMocks.warn).toHaveBeenCalledWith('SWERPG ||', 'test warn')
      expect(consoleMocks.error).toHaveBeenCalledWith('SWERPG ||', 'test error')
      expect(consoleMocks.debug).toHaveBeenCalledWith('SWERPG ||', 'test debug')
    })

    test('should handle multiple arguments in log methods', () => {
      const testObj = { key: 'value' }
      const testArray = [1, 2, 3]

      logger.info('Multiple args:', testObj, testArray, 'string')
      expect(consoleMocks.info).toHaveBeenCalledWith('SWERPG ||', 'Multiple args:', testObj, testArray, 'string')
    })
  })

  describe('Advanced Logging Methods', () => {
    beforeEach(() => {
      logger.enableDebug()
    })

    test('should handle group methods', () => {
      logger.group('Test Group')
      expect(consoleMocks.group).toHaveBeenCalledWith('SWERPG ||', 'Test Group')

      logger.groupCollapsed('Collapsed Group', 'extra data')
      expect(consoleMocks.groupCollapsed).toHaveBeenCalledWith('SWERPG ||', 'Collapsed Group', 'extra data')

      logger.groupEnd()
      expect(consoleMocks.groupEnd).toHaveBeenCalled()
    })

    test('should handle table method', () => {
      const testData = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]
      logger.table(testData)
      expect(consoleMocks.table).toHaveBeenCalledWith(testData)
    })

    test('should handle time methods with prefix', () => {
      logger.time('performance-test')
      expect(consoleMocks.time).toHaveBeenCalledWith('SWERPG || performance-test')

      logger.timeEnd('performance-test')
      expect(consoleMocks.timeEnd).toHaveBeenCalledWith('SWERPG || performance-test')
    })

    test('should handle trace method', () => {
      logger.trace('Stack trace test', 'additional info')
      expect(consoleMocks.trace).toHaveBeenCalledWith('SWERPG ||', 'Stack trace test', 'additional info')
    })

    describe('assert method', () => {
      test('should not call console.assert when condition is true', () => {
        logger.assert(true, 'This should not be logged')
        expect(consoleMocks.assert).not.toHaveBeenCalled()
      })

      test('should call console.assert when condition is false', () => {
        logger.assert(false, 'Assertion failed', 'extra data')
        expect(consoleMocks.assert).toHaveBeenCalledWith(false, 'SWERPG ||', 'Assertion failed', 'extra data')
      })

      test('should handle falsy conditions correctly', () => {
        logger.assert(0, 'Zero is falsy')
        expect(consoleMocks.assert).toHaveBeenCalledWith(0, 'SWERPG ||', 'Zero is falsy')

        logger.assert('', 'Empty string is falsy')
        expect(consoleMocks.assert).toHaveBeenCalledWith('', 'SWERPG ||', 'Empty string is falsy')

        logger.assert(null, 'Null is falsy')
        expect(consoleMocks.assert).toHaveBeenCalledWith(null, 'SWERPG ||', 'Null is falsy')
      })
    })
  })

  describe('Advanced Logging Methods - Debug Disabled', () => {
    beforeEach(() => {
      logger.disableDebug()
    })

    test('should not log group methods when debug is disabled', () => {
      logger.group('Test Group')
      logger.groupCollapsed('Collapsed Group')
      logger.groupEnd()

      expect(consoleMocks.group).not.toHaveBeenCalled()
      expect(consoleMocks.groupCollapsed).not.toHaveBeenCalled()
      expect(consoleMocks.groupEnd).not.toHaveBeenCalled()
    })

    test('should not log table when debug is disabled', () => {
      logger.table([{ test: 'data' }])
      expect(consoleMocks.table).not.toHaveBeenCalled()
    })

    test('should not log time methods when debug is disabled', () => {
      logger.time('test')
      logger.timeEnd('test')

      expect(consoleMocks.time).not.toHaveBeenCalled()
      expect(consoleMocks.timeEnd).not.toHaveBeenCalled()
    })

    test('should not log trace when debug is disabled', () => {
      logger.trace('test trace')
      expect(consoleMocks.trace).not.toHaveBeenCalled()
    })

    test('should not call assert when debug is disabled even if condition is false', () => {
      logger.assert(false, 'This should not be logged in non-debug mode')
      expect(consoleMocks.assert).not.toHaveBeenCalled()
    })
  })
})

describe('Logger Integration', () => {
  beforeEach(() => {
    // Reset logger state before each test
    logger.setDebug(false)

    // Mock console methods to capture calls
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Logger Configuration', () => {
    test('should initialize logger with debug disabled by default', () => {
      expect(logger.isDebugEnabled()).toBe(false)
    })

    test('should enable debug mode when setDebug(true) is called', () => {
      logger.setDebug(true)
      expect(logger.isDebugEnabled()).toBe(true)
    })

    test('should disable debug mode when setDebug(false) is called', () => {
      logger.setDebug(true)
      logger.setDebug(false)
      expect(logger.isDebugEnabled()).toBe(false)
    })

    test('should handle boolean conversion in setDebug', () => {
      logger.setDebug('true')
      expect(logger.isDebugEnabled()).toBe(true)

      logger.setDebug('')
      expect(logger.isDebugEnabled()).toBe(false)
    })
  })

  describe('Debug Logging Behavior', () => {
    test('should output debug messages when debug is enabled', () => {
      logger.setDebug(true)
      logger.debug('Test debug message')

      expect(console.debug).toHaveBeenCalledWith('SWERPG ||', 'Test debug message')
    })

    test('should not output debug messages when debug is disabled', () => {
      logger.setDebug(false)
      logger.debug('Test debug message')

      expect(console.debug).not.toHaveBeenCalled()
    })

    test('should always output warn messages regardless of debug mode', () => {
      logger.setDebug(false)
      logger.warn('Test warning')

      expect(console.warn).toHaveBeenCalledWith('SWERPG ||', 'Test warning')
    })

    test('should always output error messages regardless of debug mode', () => {
      logger.setDebug(false)
      logger.error('Test error')

      expect(console.error).toHaveBeenCalledWith('SWERPG ||', 'Test error')
    })
  })

  describe('Logger API Completeness', () => {
    test('should have all required logging methods', () => {
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.log).toBe('function')
    })

    test('should have debug control methods', () => {
      expect(typeof logger.setDebug).toBe('function')
      expect(typeof logger.isDebugEnabled).toBe('function')
      expect(typeof logger.enableDebug).toBe('function')
      expect(typeof logger.disableDebug).toBe('function')
    })

    test('should have advanced logging methods', () => {
      expect(typeof logger.group).toBe('function')
      expect(typeof logger.groupCollapsed).toBe('function')
      expect(typeof logger.groupEnd).toBe('function')
      expect(typeof logger.table).toBe('function')
      expect(typeof logger.time).toBe('function')
      expect(typeof logger.timeEnd).toBe('function')
    })
  })

  describe('Message Formatting', () => {
    test('should prefix all messages with SWERPG ||', () => {
      logger.setDebug(true)

      logger.debug('debug msg')
      logger.info('info msg')
      logger.warn('warn msg')
      logger.error('error msg')

      expect(console.debug).toHaveBeenCalledWith('SWERPG ||', 'debug msg')
      expect(console.info).toHaveBeenCalledWith('SWERPG ||', 'info msg')
      expect(console.warn).toHaveBeenCalledWith('SWERPG ||', 'warn msg')
      expect(console.error).toHaveBeenCalledWith('SWERPG ||', 'error msg')
    })

    test('should handle multiple arguments', () => {
      logger.setDebug(true)
      const obj = { test: 'data' }

      logger.debug('message', obj, 123)

      expect(console.debug).toHaveBeenCalledWith('SWERPG ||', 'message', obj, 123)
    })
  })
})
