'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { useUnit } from '@/components/providers/unit-context'
import { TroopAdvancementUpload } from '@/components/import/troop-advancement-upload'
import { TroopAdvancementPreview } from '@/components/import/troop-advancement-preview'
import { TroopAdvancementResult } from '@/components/import/troop-advancement-result'
import {
  stageTroopAdvancement,
  importStagedAdvancement,
} from '@/app/actions/troop-advancement-import'
import type {
  ParsedTroopAdvancement,
  StagedTroopAdvancement,
  TroopAdvancementImportResult,
} from '@/lib/import/troop-advancement-types'

type ImportStep = 'upload' | 'staging' | 'preview' | 'result'

export default function TroopAdvancementImportPage() {
  const { currentUnit } = useUnit()
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedData, setParsedData] = useState<ParsedTroopAdvancement | null>(null)
  const [stagedData, setStagedData] = useState<StagedTroopAdvancement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStaging, setIsStaging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<TroopAdvancementImportResult | null>(null)

  const handleParsed = async (data: ParsedTroopAdvancement) => {
    setParsedData(data)
    setError(null)
    setStep('staging')
    setIsStaging(true)

    if (!currentUnit?.id) {
      setError('No unit selected')
      setStep('upload')
      setIsStaging(false)
      return
    }

    try {
      // Convert map to CSV content for staging
      // We need to reconstruct the CSV or pass the raw content
      // For now, we'll pass the parsed data summary to guide staging
      const csvContent = reconstructCSVContent(data)
      const stageResult = await stageTroopAdvancement(currentUnit.id, csvContent)

      if (!stageResult.success) {
        setError(stageResult.error || 'Failed to stage advancement data')
        setStep('upload')
        return
      }

      setStagedData(stageResult.data || null)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stage advancement data')
      setStep('upload')
    } finally {
      setIsStaging(false)
    }
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleImport = async (selectedBsaMemberIds: string[], createUnmatchedScouts: boolean) => {
    if (!currentUnit?.id || !stagedData) {
      setError('Missing required data')
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const importResult = await importStagedAdvancement(
        currentUnit.id,
        stagedData,
        selectedBsaMemberIds,
        createUnmatchedScouts
      )

      if (!importResult.success) {
        setError(importResult.error || 'Import failed')
        setIsImporting(false)
        return
      }

      setResult(importResult.data || null)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancel = () => {
    setStep('upload')
    setParsedData(null)
    setStagedData(null)
    setError(null)
  }

  const handleStartOver = () => {
    setStep('upload')
    setParsedData(null)
    setStagedData(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings?tab=data">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-stone-900">Import Troop Advancement</h1>
        <p className="mt-1 text-stone-600">
          Bulk import advancement data for all scouts from a Scoutbook Troop Advancement export
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-error bg-error-light">
          <CardContent className="pt-6">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload Troop Advancement File
            </CardTitle>
            <CardDescription>
              Upload a Scoutbook Troop Advancement CSV export containing data for all scouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TroopAdvancementUpload onParsed={handleParsed} onError={handleError} />

            <div className="mt-6 rounded-lg bg-stone-50 p-4">
              <h3 className="font-medium text-stone-900">How to export from Scoutbook:</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-stone-600">
                <li>Log in to scoutbook.scouting.org</li>
                <li>Navigate to your troop/unit</li>
                <li>Click Menu &rarr; Unit &rarr; Export Advancement</li>
                <li>Select all advancement types and scouts</li>
                <li>Export as CSV and upload the file here</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Staging indicator */}
      {step === 'staging' && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-forest-600 border-t-transparent" />
              <p className="mt-4 text-stone-600">Analyzing advancement data...</p>
              <p className="text-sm text-stone-500">
                Matching scouts and checking for duplicates
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && stagedData && (
        <TroopAdvancementPreview
          staged={stagedData}
          onImport={handleImport}
          onCancel={handleCancel}
          isImporting={isImporting}
        />
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <TroopAdvancementResult result={result} onStartOver={handleStartOver} />
      )}
    </div>
  )
}

/**
 * Reconstruct CSV content from parsed data for staging
 * This is needed because the staging action needs raw CSV to match scouts
 */
function reconstructCSVContent(data: ParsedTroopAdvancement): string {
  const lines: string[] = []

  // Header
  lines.push(
    'bsamemberid,firstname,nickname,middlename,lastname,advancementtype,advancement,version,awarded,datecompleted,approved,markedcompleteddate,markedcompleteduserid,markedcompletedby,counselorapprovedby,counselorapproveddate,leaderapprovedby,leaderapproveddate,awardedby,awardeddate,id,unitnumber,unittypeid'
  )

  for (const [, scout] of data.scouts) {
    // Ranks
    for (const rank of scout.ranks) {
      lines.push(
        `"${scout.bsaMemberId}","${scout.firstName}","","${scout.middleName}","${scout.lastName}","Rank","${rank.rankName}","${rank.version}",${rank.awarded ? 1 : 0},${rank.awardedDate || '/  /'},0,/  /,0,"","",/  /,"",/  /,"",${rank.awardedDate || '/  /'},0,0,0`
      )
    }

    // Rank requirements
    for (const req of scout.rankRequirements) {
      const rankName = getRankNameFromCode(req.rankCode)
      lines.push(
        `"${scout.bsaMemberId}","${scout.firstName}","","${scout.middleName}","${scout.lastName}","${rankName} Rank Requirements","${req.requirementNumber}","${req.version}",0,${req.completedDate || '/  /'},1,${req.completedDate || '/  /'},0,"","",/  /,"",/  /,"",/  /,0,0,0`
      )
    }

    // Merit badges
    for (const badge of scout.meritBadges) {
      lines.push(
        `"${scout.bsaMemberId}","${scout.firstName}","","${scout.middleName}","${scout.lastName}","Merit Badges","${badge.badgeName}","${badge.version}",${badge.awarded ? 1 : 0},${badge.awardedDate || '/  /'},0,/  /,0,"","",/  /,"",/  /,"",${badge.awardedDate || '/  /'},0,0,0`
      )
    }

    // Merit badge requirements
    for (const req of scout.meritBadgeRequirements) {
      lines.push(
        `"${scout.bsaMemberId}","${scout.firstName}","","${scout.middleName}","${scout.lastName}","${req.badgeName} Merit Badge Requirements","${req.requirementNumber}","${req.version}",0,${req.completedDate || '/  /'},1,${req.completedDate || '/  /'},0,"","",/  /,"",/  /,"",/  /,0,0,0`
      )
    }
  }

  return lines.join('\n')
}

function getRankNameFromCode(code: string): string {
  const map: Record<string, string> = {
    scout: 'Scout',
    tenderfoot: 'Tenderfoot',
    second_class: 'Second Class',
    first_class: 'First Class',
    star: 'Star',
    life: 'Life',
    eagle: 'Eagle',
  }
  return map[code] || code
}
