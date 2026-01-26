'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  parseTroopAdvancementCSV,
  validateParsedData,
  getParsedDataSummary,
} from '@/lib/import/scoutbook-troop-advancement-parser'
import type { ParsedTroopAdvancement } from '@/lib/import/troop-advancement-types'

interface TroopAdvancementUploadProps {
  onParsed: (data: ParsedTroopAdvancement) => void
  onError: (error: string) => void
}

export function TroopAdvancementUpload({ onParsed, onError }: TroopAdvancementUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseSummary, setParseSummary] = useState<ReturnType<typeof getParsedDataSummary> | null>(
    null
  )

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        onError('Please upload a CSV file')
        return
      }

      setFile(file)
      setIsParsing(true)
      setParseSummary(null)

      try {
        const content = await file.text()
        const data = parseTroopAdvancementCSV(content)
        const errors = validateParsedData(data)

        // Add validation errors
        data.errors = [...data.errors, ...errors]

        // Check if we have any usable data
        const summary = getParsedDataSummary(data)
        setParseSummary(summary)

        if (summary.scoutCount === 0 || summary.totalAdvancement === 0) {
          onError(
            'Could not parse any advancement data from this file. Please ensure this is a Scoutbook Troop Advancement CSV export.'
          )
          setFile(null)
          setParseSummary(null)
        } else {
          onParsed(data)
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to parse file')
        setFile(null)
        setParseSummary(null)
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
    setParseSummary(null)
  }, [])

  if (file && parseSummary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-forest-600" />
              <div>
                <CardTitle className="text-lg">{file.name}</CardTitle>
                <CardDescription>
                  {isParsing ? 'Parsing...' : 'File parsed successfully'}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile} disabled={isParsing}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-stone-50 p-3 text-center">
              <p className="text-2xl font-bold text-forest-600">{parseSummary.scoutCount}</p>
              <p className="text-sm text-stone-500">Scouts</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 text-center">
              <p className="text-2xl font-bold text-forest-600">{parseSummary.ranks}</p>
              <p className="text-sm text-stone-500">Ranks</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 text-center">
              <p className="text-2xl font-bold text-forest-600">{parseSummary.meritBadges}</p>
              <p className="text-sm text-stone-500">Merit Badges</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 text-center">
              <p className="text-2xl font-bold text-forest-600">
                {parseSummary.rankRequirements + parseSummary.meritBadgeRequirements}
              </p>
              <p className="text-sm text-stone-500">Requirements</p>
            </div>
          </div>
          {parseSummary.errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-warning bg-warning-light p-3">
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {parseSummary.errors.length} warning(s) during parsing
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
        Drag and drop your Scoutbook Troop Advancement CSV here, or
      </p>
      <label className="mt-2 cursor-pointer">
        <span className="font-medium text-forest-600 hover:text-forest-700">browse to select</span>
        <input type="file" accept=".csv" className="sr-only" onChange={handleFileSelect} />
      </label>
      <p className="mt-4 text-center text-xs text-stone-500">
        Export from Scoutbook &rarr; Menu &rarr; Troop &rarr; Export Advancement
      </p>
    </div>
  )
}
