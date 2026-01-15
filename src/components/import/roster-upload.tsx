'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseRosterCSV, validateRoster, type ParsedRoster } from '@/lib/import/bsa-roster-parser'

interface RosterUploadProps {
  onParsed: (roster: ParsedRoster) => void
  onError: (error: string) => void
}

export function RosterUpload({ onParsed, onError }: RosterUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      onError('Please upload a CSV file')
      return
    }

    setFile(file)
    setIsParsing(true)

    try {
      const content = await file.text()
      const roster = parseRosterCSV(content)
      const errors = validateRoster(roster)

      if (errors.length > 0 && roster.adults.length === 0 && roster.scouts.length === 0) {
        onError(`Failed to parse roster: ${errors.join(', ')}`)
        setFile(null)
      } else {
        // Include validation errors but still proceed
        roster.errors = errors
        onParsed(roster)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to parse file')
      setFile(null)
    } finally {
      setIsParsing(false)
    }
  }, [onParsed, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }, [processFile])

  const clearFile = useCallback(() => {
    setFile(null)
  }, [])

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-forest-600" />
          <div>
            <p className="font-medium text-stone-900">{file.name}</p>
            <p className="text-sm text-stone-500">
              {isParsing ? 'Parsing...' : 'Ready to preview'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearFile} disabled={isParsing}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
        isDragging
          ? 'border-forest-500 bg-forest-50'
          : 'border-stone-300 bg-stone-50 hover:border-stone-400'
      }`}
    >
      <Upload className={`h-12 w-12 ${isDragging ? 'text-forest-500' : 'text-stone-400'}`} />
      <p className="mt-4 text-center text-stone-600">
        Drag and drop your BSA roster CSV file here, or
      </p>
      <label className="mt-2 cursor-pointer">
        <span className="text-forest-600 hover:text-forest-700 font-medium">browse to select</span>
        <input
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFileSelect}
        />
      </label>
      <p className="mt-4 text-xs text-stone-500">
        Export your roster from my.scouting.org &rarr; Unit Roster &rarr; Export CSV
      </p>
    </div>
  )
}
