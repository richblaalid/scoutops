'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  parseScoutbookHistory,
  validateScoutbookHistory,
  type ParsedScoutbookHistory,
} from '@/lib/import/scoutbook-history-parser'

interface ScoutbookHistoryUploadProps {
  onParsed: (data: ParsedScoutbookHistory) => void
  onError: (error: string) => void
}

export function ScoutbookHistoryUpload({ onParsed, onError }: ScoutbookHistoryUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        onError('Please upload a CSV file')
        return
      }

      setFile(file)
      setIsParsing(true)

      try {
        const content = await file.text()
        const data = parseScoutbookHistory(content)
        const errors = validateScoutbookHistory(data)

        // Add validation errors to data
        data.errors = [...data.errors, ...errors]

        // Check if we have any usable data
        const hasUsableData =
          data.rankProgress.length > 0 ||
          data.completedMeritBadges.length > 0 ||
          data.partialMeritBadges.length > 0 ||
          data.leadershipHistory.length > 0

        if (!hasUsableData && !data.scout.fullName) {
          onError('Could not parse any advancement data from this file. Please ensure this is a ScoutBook History Report CSV.')
          setFile(null)
        } else {
          onParsed(data)
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to parse file')
        setFile(null)
      } finally {
        setIsParsing(false)
      }
    },
    [onParsed, onError]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        processFile(droppedFile)
      }
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        processFile(selectedFile)
      }
    },
    [processFile]
  )

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
            <p className="text-sm text-stone-500">{isParsing ? 'Parsing...' : 'Ready to preview'}</p>
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
        Drag and drop your ScoutBook History Report CSV here, or
      </p>
      <label className="mt-2 cursor-pointer">
        <span className="font-medium text-forest-600 hover:text-forest-700">browse to select</span>
        <input type="file" accept=".csv" className="sr-only" onChange={handleFileSelect} />
      </label>
      <p className="mt-4 text-center text-xs text-stone-500">
        Export from ScoutBook &rarr; Select Scout &rarr; Scouts BSA History &rarr; Export
      </p>
    </div>
  )
}
