/**
 * Tests for polling interval configuration logic
 */

describe('Polling Interval Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('environment variable parsing', () => {
    it('should parse valid polling interval', () => {
      process.env.NEXT_PUBLIC_POLLING_INTERVAL = '30000'
      const interval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
      expect(interval).toBe(30000)
    })

    it('should use default when environment variable is not set', () => {
      delete process.env.NEXT_PUBLIC_POLLING_INTERVAL
      const interval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
      expect(interval).toBe(60000)
    })

    it('should handle invalid values gracefully', () => {
      process.env.NEXT_PUBLIC_POLLING_INTERVAL = 'invalid'
      const interval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
      // parseInt('invalid') returns NaN, but we can test the fallback
      expect(isNaN(interval)).toBe(true)
      
      // Test with fallback logic
      const finalInterval = isNaN(interval) ? 60000 : interval
      expect(finalInterval).toBe(60000)
    })

    it('should handle zero values', () => {
      process.env.NEXT_PUBLIC_POLLING_INTERVAL = '0'
      const interval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
      expect(interval).toBe(0)
      
      // Test with validation logic
      const finalInterval = interval > 0 ? interval : 60000
      expect(finalInterval).toBe(60000)
    })

    it('should handle negative values', () => {
      process.env.NEXT_PUBLIC_POLLING_INTERVAL = '-5000'
      const interval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
      expect(interval).toBe(-5000)
      
      // Test with validation logic
      const finalInterval = interval > 0 ? interval : 60000
      expect(finalInterval).toBe(60000)
    })

    it('should handle large values', () => {
      process.env.NEXT_PUBLIC_POLLING_INTERVAL = '300000' // 5 minutes
      const interval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
      expect(interval).toBe(300000)
    })

    it('should handle values with decimals', () => {
      process.env.NEXT_PUBLIC_POLLING_INTERVAL = '45000.5'
      const interval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
      expect(interval).toBe(45000) // parseInt truncates decimals
    })
  })

  describe('configuration validation', () => {
    const validatePollingInterval = (envValue: string | undefined): number => {
      const parsed = parseInt(envValue || '60000', 10)
      return isNaN(parsed) || parsed <= 0 ? 60000 : parsed
    }

    it('should validate and return correct intervals', () => {
      expect(validatePollingInterval('30000')).toBe(30000)
      expect(validatePollingInterval('60000')).toBe(60000)
      expect(validatePollingInterval('120000')).toBe(120000)
    })

    it('should return default for invalid inputs', () => {
      expect(validatePollingInterval('invalid')).toBe(60000)
      expect(validatePollingInterval('0')).toBe(60000)
      expect(validatePollingInterval('-1000')).toBe(60000)
      expect(validatePollingInterval('')).toBe(60000)
      expect(validatePollingInterval(undefined)).toBe(60000)
    })

    it('should handle edge cases', () => {
      expect(validatePollingInterval('1')).toBe(1) // Very short but valid
      expect(validatePollingInterval('999999999')).toBe(999999999) // Very long but valid
    })
  })

  describe('rate limiting considerations', () => {
    const isRateLimitFriendly = (intervalMs: number): boolean => {
      // GitHub API allows ~5000 requests per hour for authenticated users
      // With 6 projects, that's ~833 requests per project per hour
      // So intervals should be at least 4.3 seconds (4300ms) per project
      // But we'll use 30 seconds (30000ms) as a safe minimum
      return intervalMs >= 30000
    }

    it('should identify rate-limit friendly intervals', () => {
      expect(isRateLimitFriendly(30000)).toBe(true)
      expect(isRateLimitFriendly(60000)).toBe(true)
      expect(isRateLimitFriendly(120000)).toBe(true)
    })

    it('should identify potentially problematic intervals', () => {
      expect(isRateLimitFriendly(1000)).toBe(false)   // 1 second - too fast
      expect(isRateLimitFriendly(5000)).toBe(false)   // 5 seconds - too fast
      expect(isRateLimitFriendly(15000)).toBe(false)  // 15 seconds - borderline
    })
  })
})