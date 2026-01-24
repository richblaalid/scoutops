/**
 * Unit tests for notes-utils.ts
 * Tests for parsing, serializing, and managing requirement notes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseNotes,
  serializeNotes,
  appendNote,
  createCompletionNote,
  createUndoNote,
  formatNoteTimestamp,
  getNoteTypeLabel,
  type RequirementNote,
} from '@/lib/notes-utils'

describe('notes-utils', () => {
  // Mock Date for consistent timestamps in tests
  const mockDate = new Date('2024-03-15T10:30:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('parseNotes', () => {
    it('should return empty array for null input', () => {
      const result = parseNotes(null)
      expect(result).toEqual([])
    })

    it('should return empty array for empty string', () => {
      const result = parseNotes('')
      expect(result).toEqual([])
    })

    it('should return empty array for whitespace-only string', () => {
      const result = parseNotes('   ')
      expect(result).toEqual([])
    })

    it('should parse valid JSON array of notes', () => {
      const notes: RequirementNote[] = [
        {
          id: 'note-1',
          text: 'First note',
          author: 'John Doe',
          authorId: 'user-1',
          timestamp: '2024-03-10T08:00:00.000Z',
          type: 'completion',
        },
        {
          id: 'note-2',
          text: 'Second note',
          author: 'Jane Smith',
          authorId: 'user-2',
          timestamp: '2024-03-11T09:00:00.000Z',
          type: 'general',
        },
      ]
      const result = parseNotes(JSON.stringify(notes))
      expect(result).toEqual(notes)
    })

    it('should convert legacy plain text to note object', () => {
      const legacyText = 'This is an old note format'
      const result = parseNotes(legacyText)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe(legacyText)
      expect(result[0].author).toBe('Unknown')
      expect(result[0].authorId).toBe('')
      expect(result[0].type).toBe('general')
      expect(result[0].id).toBeDefined()
      expect(result[0].timestamp).toBeDefined()
    })

    it('should convert non-array JSON to note object', () => {
      const jsonObject = JSON.stringify({ message: 'Some object' })
      const result = parseNotes(jsonObject)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('[object Object]')
      expect(result[0].author).toBe('Unknown')
      expect(result[0].type).toBe('general')
    })

    it('should handle JSON string value as legacy', () => {
      const jsonString = JSON.stringify('Just a string value')
      const result = parseNotes(jsonString)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Just a string value')
      expect(result[0].type).toBe('general')
    })
  })

  describe('serializeNotes', () => {
    it('should serialize empty array', () => {
      const result = serializeNotes([])
      expect(result).toBe('[]')
    })

    it('should serialize single note', () => {
      const notes: RequirementNote[] = [
        {
          id: 'note-1',
          text: 'Test note',
          author: 'Author',
          authorId: 'author-id',
          timestamp: '2024-03-15T10:00:00.000Z',
          type: 'completion',
        },
      ]
      const result = serializeNotes(notes)
      expect(JSON.parse(result)).toEqual(notes)
    })

    it('should serialize multiple notes', () => {
      const notes: RequirementNote[] = [
        {
          id: 'note-1',
          text: 'First',
          author: 'A',
          authorId: 'a-1',
          timestamp: '2024-03-15T10:00:00.000Z',
          type: 'completion',
        },
        {
          id: 'note-2',
          text: 'Second',
          author: 'B',
          authorId: 'b-2',
          timestamp: '2024-03-15T11:00:00.000Z',
          type: 'undo',
        },
      ]
      const result = serializeNotes(notes)
      expect(JSON.parse(result)).toEqual(notes)
    })
  })

  describe('appendNote', () => {
    it('should append note to empty notes string', () => {
      const result = appendNote(null, {
        text: 'New note',
        author: 'Test Author',
        authorId: 'author-123',
        type: 'general',
      })

      const parsed = JSON.parse(result)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].text).toBe('New note')
      expect(parsed[0].author).toBe('Test Author')
      expect(parsed[0].authorId).toBe('author-123')
      expect(parsed[0].type).toBe('general')
      expect(parsed[0].timestamp).toBe(mockDate.toISOString())
    })

    it('should append note to existing notes', () => {
      const existingNotes: RequirementNote[] = [
        {
          id: 'existing-1',
          text: 'Existing note',
          author: 'Previous Author',
          authorId: 'prev-author',
          timestamp: '2024-03-14T08:00:00.000Z',
          type: 'completion',
        },
      ]
      const existingString = JSON.stringify(existingNotes)

      const result = appendNote(existingString, {
        text: 'Appended note',
        author: 'New Author',
        authorId: 'new-author',
        type: 'undo',
      })

      const parsed = JSON.parse(result)
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual(existingNotes[0])
      expect(parsed[1].text).toBe('Appended note')
      expect(parsed[1].type).toBe('undo')
    })

    it('should generate unique IDs for each appended note', () => {
      const result1 = appendNote(null, {
        text: 'Note 1',
        author: 'Author',
        authorId: 'author-1',
        type: 'general',
      })

      const result2 = appendNote(result1, {
        text: 'Note 2',
        author: 'Author',
        authorId: 'author-1',
        type: 'general',
      })

      const parsed = JSON.parse(result2)
      expect(parsed[0].id).not.toBe(parsed[1].id)
    })
  })

  describe('createCompletionNote', () => {
    it('should create completion note with correct fields', () => {
      const note = createCompletionNote('Completed at meeting', 'John Leader', 'leader-123')

      expect(note.text).toBe('Completed at meeting')
      expect(note.author).toBe('John Leader')
      expect(note.authorId).toBe('leader-123')
      expect(note.type).toBe('completion')
      expect(note.timestamp).toBe(mockDate.toISOString())
      expect(note.id).toBeDefined()
    })

    it('should generate unique IDs', () => {
      const note1 = createCompletionNote('Note 1', 'Author', 'author-1')
      const note2 = createCompletionNote('Note 2', 'Author', 'author-1')

      expect(note1.id).not.toBe(note2.id)
    })
  })

  describe('createUndoNote', () => {
    it('should create undo note with correct fields', () => {
      const note = createUndoNote('Marked by mistake', 'Jane Leader', 'leader-456')

      expect(note.text).toBe('Marked by mistake')
      expect(note.author).toBe('Jane Leader')
      expect(note.authorId).toBe('leader-456')
      expect(note.type).toBe('undo')
      expect(note.timestamp).toBe(mockDate.toISOString())
      expect(note.id).toBeDefined()
    })
  })

  describe('formatNoteTimestamp', () => {
    it('should format timestamp in US locale', () => {
      const result = formatNoteTimestamp('2024-03-15T10:30:00.000Z')
      // Note: The exact format depends on timezone, so we check for key elements
      expect(result).toContain('Mar')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should handle different timestamps', () => {
      // Use midday UTC times to avoid timezone boundary issues
      const result1 = formatNoteTimestamp('2024-01-15T12:00:00.000Z')
      const result2 = formatNoteTimestamp('2024-12-15T12:00:00.000Z')

      expect(result1).toContain('Jan')
      expect(result1).toContain('15')
      expect(result2).toContain('Dec')
      expect(result2).toContain('15')
    })

    it('should include time component', () => {
      const result = formatNoteTimestamp('2024-06-15T14:30:00.000Z')
      // Should contain some time representation (hour:minute format varies by timezone)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('getNoteTypeLabel', () => {
    it('should return "Completed" for completion type', () => {
      expect(getNoteTypeLabel('completion')).toBe('Completed')
    })

    it('should return "Undone" for undo type', () => {
      expect(getNoteTypeLabel('undo')).toBe('Undone')
    })

    it('should return "Note" for general type', () => {
      expect(getNoteTypeLabel('general')).toBe('Note')
    })
  })

  describe('round-trip serialization', () => {
    it('should preserve notes through serialize/parse cycle', () => {
      const originalNotes: RequirementNote[] = [
        {
          id: 'uuid-1',
          text: 'Note with special chars: <>&"\'',
          author: 'Test User',
          authorId: 'user-abc',
          timestamp: '2024-03-15T10:00:00.000Z',
          type: 'completion',
        },
        {
          id: 'uuid-2',
          text: 'Multiline\nnote\ntext',
          author: 'Another User',
          authorId: 'user-xyz',
          timestamp: '2024-03-15T11:00:00.000Z',
          type: 'general',
        },
      ]

      const serialized = serializeNotes(originalNotes)
      const parsed = parseNotes(serialized)

      expect(parsed).toEqual(originalNotes)
    })
  })
})
