import { cn } from '../utils'

describe('utils', () => {
  describe('cn function', () => {
    it('should combine class names correctly', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class')
      expect(result).toBe('base-class conditional-class')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class')
      expect(result).toBe('base-class valid-class')
    })

    it('should handle empty strings', () => {
      const result = cn('base-class', '', 'valid-class', '')
      expect(result).toBe('base-class valid-class')
    })

    it('should handle mixed types', () => {
      const result = cn('base-class', true && 'conditional', undefined, 'final-class')
      expect(result).toBe('base-class conditional final-class')
    })

    it('should return empty string for no arguments', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle single class', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })

    it('should handle complex conditional logic', () => {
      const isActive = true
      const isDisabled = false
      const result = cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled',
        'always-present'
      )
      expect(result).toBe('base-class active always-present')
    })
  })
}) 