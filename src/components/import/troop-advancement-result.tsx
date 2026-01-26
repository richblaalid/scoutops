'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  AlertCircle,
  Award,
  Medal,
  UserPlus,
  ExternalLink,
} from 'lucide-react'
import type { TroopAdvancementImportResult } from '@/lib/import/troop-advancement-types'

interface TroopAdvancementResultProps {
  result: TroopAdvancementImportResult
  onStartOver: () => void
}

export function TroopAdvancementResult({ result, onStartOver }: TroopAdvancementResultProps) {
  const totalImported =
    result.ranksImported +
    result.rankRequirementsImported +
    result.badgesImported +
    result.badgeRequirementsImported

  const hasWarnings = result.warnings.length > 0

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-success bg-success-light">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-6 w-6" />
            Import Complete
          </CardTitle>
          <CardDescription className="text-success">
            Successfully imported {totalImported} advancement records
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Results Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {result.scoutsCreated > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Scouts Created</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-forest-600" />
                {result.scoutsCreated}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-500">New scout records</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ranks</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-forest-600" />
              {result.ranksImported}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              + {result.rankRequirementsImported} requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Merit Badges</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-forest-600" />
              {result.badgesImported}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              + {result.badgeRequirementsImported} requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duplicates Skipped</CardDescription>
            <CardTitle className="flex items-center gap-2 text-stone-500">
              {result.duplicatesSkipped}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">Already existed</p>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <Card className="border-warning bg-warning-light">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              {result.warnings.length} Warning{result.warnings.length !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription className="text-warning">
              Some items could not be imported
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              <ul className="space-y-1 text-sm text-warning">
                {result.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
                    {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/advancement">
              View Advancement
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/roster">
              View Roster
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Button variant="outline" onClick={onStartOver}>
          Import Another File
        </Button>
      </div>
    </div>
  )
}
