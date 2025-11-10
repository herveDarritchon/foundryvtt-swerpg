import { describe, it, expect, beforeEach, vi } from 'vitest'
import { logger } from '../../module/utils/logger.mjs'

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
    it('should initialize logger with debug disabled by default', () => {
      expect(logger.isDebugEnabled()).toBe(false)
    })

    it('should enable debug mode when setDebug(true) is called', () => {
      logger.setDebug(true)
      expect(logger.isDebugEnabled()).toBe(true)
    })

    it('should disable debug mode when setDebug(false) is called', () => {
      logger.setDebug(true)
      logger.setDebug(false)
      expect(logger.isDebugEnabled()).toBe(false)
    })

    it('should handle boolean conversion in setDebug', () => {
      logger.setDebug('true')
      expect(logger.isDebugEnabled()).toBe(true)

      logger.setDebug('')
      expect(logger.isDebugEnabled()).toBe(false)
    })
  })

  describe('Debug Logging Behavior', () => {
    it('should output debug messages when debug is enabled', () => {
      logger.setDebug(true)
      logger.debug('Test debug message')

      expect(console.debug).toHaveBeenCalledWith('SWERPG ||', 'Test debug message')
    })

    it('should not output debug messages when debug is disabled', () => {
      logger.setDebug(false)
      logger.debug('Test debug message')

      expect(console.debug).not.toHaveBeenCalled()
    })

    it('should always output warn messages regardless of debug mode', () => {
      logger.setDebug(false)
      logger.warn('Test warning')

      expect(console.warn).toHaveBeenCalledWith('SWERPG ||', 'Test warning')
    })

    it('should always output error messages regardless of debug mode', () => {
      logger.setDebug(false)
      logger.error('Test error')

      expect(console.error).toHaveBeenCalledWith('SWERPG ||', 'Test error')
    })
  })

  describe('Logger API Completeness', () => {
    it('should have all required logging methods', () => {
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.log).toBe('function')
    })

    it('should have debug control methods', () => {
      expect(typeof logger.setDebug).toBe('function')
      expect(typeof logger.isDebugEnabled).toBe('function')
      expect(typeof logger.enableDebug).toBe('function')
      expect(typeof logger.disableDebug).toBe('function')
    })

    it('should have advanced logging methods', () => {
      expect(typeof logger.group).toBe('function')
      expect(typeof logger.groupCollapsed).toBe('function')
      expect(typeof logger.groupEnd).toBe('function')
      expect(typeof logger.table).toBe('function')
      expect(typeof logger.time).toBe('function')
      expect(typeof logger.timeEnd).toBe('function')
    })
  })

  describe('Message Formatting', () => {
    it('should prefix all messages with SWERPG ||', () => {
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

    it('should handle multiple arguments', () => {
      logger.setDebug(true)
      const obj = { test: 'data' }

      logger.debug('message', obj, 123)

      expect(console.debug).toHaveBeenCalledWith('SWERPG ||', 'message', obj, 123)
    })
  })
})
