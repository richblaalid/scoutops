import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { encrypt, decrypt, generateEncryptionKey } from '@/lib/encryption'

// Store original env
const originalEnv = process.env.TOKEN_ENCRYPTION_KEY

describe('Encryption', () => {
  // Valid 32-byte hex key (64 characters)
  const validKey = 'a'.repeat(64)

  beforeEach(() => {
    // Set a valid encryption key for tests
    process.env.TOKEN_ENCRYPTION_KEY = validKey
  })

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.TOKEN_ENCRYPTION_KEY = originalEnv
    } else {
      delete process.env.TOKEN_ENCRYPTION_KEY
    }
  })

  describe('encrypt', () => {
    it('should encrypt plaintext and return formatted string', () => {
      const plaintext = 'test secret data'
      const encrypted = encrypt(plaintext)

      // Should have format: iv:authTag:ciphertext
      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)

      // IV should be 24 hex chars (12 bytes)
      expect(parts[0]).toHaveLength(24)
      // Auth tag should be 32 hex chars (16 bytes)
      expect(parts[1]).toHaveLength(32)
      // Ciphertext should be hex encoded
      expect(parts[2].length).toBeGreaterThan(0)
    })

    it('should produce different ciphertexts for same plaintext (unique IV)', () => {
      const plaintext = 'same message'

      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should throw if encryption key is not set', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY

      expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY environment variable is not set')
    })

    it('should throw if encryption key is wrong length', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'short'

      expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY must be a 64-character hex string')
    })

    it('should handle empty string', () => {
      const encrypted = encrypt('')
      expect(encrypted).toBeDefined()
      expect(encrypted.split(':')).toHaveLength(3)
    })

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'
      const encrypted = encrypt(plaintext)
      expect(encrypted).toBeDefined()
    })

    it('should handle unicode characters', () => {
      const plaintext = '日本語テスト 🎉 émojis'
      const encrypted = encrypt(plaintext)
      expect(encrypted).toBeDefined()
    })

    it('should handle long strings', () => {
      const plaintext = 'x'.repeat(10000)
      const encrypted = encrypt(plaintext)
      expect(encrypted).toBeDefined()
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted data back to original', () => {
      const plaintext = 'test secret data'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should round-trip empty string', () => {
      const plaintext = ''
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should round-trip special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should round-trip unicode characters', () => {
      const plaintext = '日本語テスト 🎉 émojis'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should round-trip JSON data', () => {
      const data = { accessToken: 'abc123', refreshToken: 'xyz789', expiry: 1234567890 }
      const plaintext = JSON.stringify(data)
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(JSON.parse(decrypted)).toEqual(data)
    })

    it('should throw for invalid format (missing parts)', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format')
      expect(() => decrypt('part1:part2')).toThrow('Invalid encrypted data format')
    })

    it('should throw for invalid IV length', () => {
      // IV should be 24 hex chars (12 bytes), using 20 chars here
      const invalidEncrypted = 'a'.repeat(20) + ':' + 'b'.repeat(32) + ':ciphertext'
      expect(() => decrypt(invalidEncrypted)).toThrow('Invalid IV length')
    })

    it('should throw for invalid auth tag length', () => {
      // Auth tag should be 32 hex chars (16 bytes), using 20 chars here
      const invalidEncrypted = 'a'.repeat(24) + ':' + 'b'.repeat(20) + ':ciphertext'
      expect(() => decrypt(invalidEncrypted)).toThrow('Invalid auth tag length')
    })

    it('should throw for tampered ciphertext', () => {
      const plaintext = 'test data'
      const encrypted = encrypt(plaintext)
      const parts = encrypted.split(':')

      // Tamper with the ciphertext
      const tampered = parts[0] + ':' + parts[1] + ':' + 'tampered'

      expect(() => decrypt(tampered)).toThrow()
    })

    it('should throw for tampered auth tag', () => {
      const plaintext = 'test data'
      const encrypted = encrypt(plaintext)
      const parts = encrypted.split(':')

      // Tamper with the auth tag
      const tampered = parts[0] + ':' + 'f'.repeat(32) + ':' + parts[2]

      expect(() => decrypt(tampered)).toThrow()
    })

    it('should throw if encryption key is wrong', () => {
      const plaintext = 'test data'
      const encrypted = encrypt(plaintext)

      // Change the key
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)

      expect(() => decrypt(encrypted)).toThrow()
    })
  })

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey()

      expect(key).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(key)).toBe(true)
    })

    it('should generate unique keys each time', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()

      expect(key1).not.toBe(key2)
    })

    it('should generate valid keys that can be used for encryption', () => {
      const key = generateEncryptionKey()
      process.env.TOKEN_ENCRYPTION_KEY = key

      const plaintext = 'test data'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })
  })
})
