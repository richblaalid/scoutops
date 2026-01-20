/**
 * Utilities for managing requirement notes as JSON arrays
 * Notes are stored as a JSON array string in the database `notes` field
 */

// Generate UUID that works in both browser and Node.js
function generateUUID(): string {
  // Browser environment
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  // Node.js environment
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface RequirementNote {
  id: string
  text: string
  author: string
  authorId: string
  timestamp: string
  type: 'completion' | 'undo' | 'general'
}

/**
 * Parse notes from database string to array
 * Handles both legacy string notes and new JSON array format
 */
export function parseNotes(notesString: string | null): RequirementNote[] {
  if (!notesString) return []

  try {
    const parsed = JSON.parse(notesString)
    if (Array.isArray(parsed)) {
      return parsed as RequirementNote[]
    }
    // If it's valid JSON but not an array, treat as legacy
    return [{
      id: generateUUID(),
      text: String(parsed),
      author: 'Unknown',
      authorId: '',
      timestamp: new Date().toISOString(),
      type: 'general',
    }]
  } catch {
    // Not valid JSON - treat as legacy plain text note
    if (notesString.trim()) {
      return [{
        id: generateUUID(),
        text: notesString,
        author: 'Unknown',
        authorId: '',
        timestamp: new Date().toISOString(),
        type: 'general',
      }]
    }
    return []
  }
}

/**
 * Serialize notes array to string for database storage
 */
export function serializeNotes(notes: RequirementNote[]): string {
  return JSON.stringify(notes)
}

/**
 * Append a new note to existing notes
 */
export function appendNote(
  existingNotesString: string | null,
  newNote: {
    text: string
    author: string
    authorId: string
    type: 'completion' | 'undo' | 'general'
  }
): string {
  const existing = parseNotes(existingNotesString)
  const note: RequirementNote = {
    id: generateUUID(),
    text: newNote.text,
    author: newNote.author,
    authorId: newNote.authorId,
    timestamp: new Date().toISOString(),
    type: newNote.type,
  }
  existing.push(note)
  return serializeNotes(existing)
}

/**
 * Create a new note for completion
 */
export function createCompletionNote(
  text: string,
  author: string,
  authorId: string
): RequirementNote {
  return {
    id: generateUUID(),
    text,
    author,
    authorId,
    timestamp: new Date().toISOString(),
    type: 'completion',
  }
}

/**
 * Create a new note for undo action
 */
export function createUndoNote(
  reason: string,
  author: string,
  authorId: string
): RequirementNote {
  return {
    id: generateUUID(),
    text: reason,
    author,
    authorId,
    timestamp: new Date().toISOString(),
    type: 'undo',
  }
}

/**
 * Format a note's timestamp for display
 */
export function formatNoteTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get the type label for display
 */
export function getNoteTypeLabel(type: RequirementNote['type']): string {
  switch (type) {
    case 'completion':
      return 'Completed'
    case 'undo':
      return 'Undone'
    case 'general':
    default:
      return 'Note'
  }
}
