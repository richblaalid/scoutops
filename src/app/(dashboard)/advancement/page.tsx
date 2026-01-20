import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { redirect } from 'next/navigation'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import { Award, Star, Clock, Users, AlertCircle, BookOpen, Medal } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdvancementPage() {
  // Check feature flag
  if (!isFeatureEnabled(FeatureFlag.ADVANCEMENT_TRACKING)) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's profile and membership
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profileData) redirect('/setup')

  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', profileData.id)
    .eq('status', 'active')
    .single()

  if (!membershipData) redirect('/setup')

  const membership = membershipData as { unit_id: string; role: string }
  const canEdit = ['admin', 'treasurer', 'leader'].includes(membership.role)

  // Get all scouts in the unit
  const { data: scoutsData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      rank,
      is_active,
      patrols (
        name
      )
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name')

  interface Scout {
    id: string
    first_name: string
    last_name: string
    rank: string | null
    is_active: boolean | null
    patrols: { name: string } | null
  }

  const scouts = (scoutsData || []) as Scout[]

  // Get rank progress for all scouts in unit
  const { data: rankProgressData } = await supabase
    .from('scout_rank_progress')
    .select(`
      id,
      scout_id,
      status,
      bsa_ranks (
        id,
        name,
        display_order
      ),
      scout_rank_requirement_progress (
        id,
        status
      )
    `)
    .in('scout_id', scouts.map((s) => s.id))

  interface RankProgress {
    id: string
    scout_id: string
    status: string
    bsa_ranks: { id: string; name: string; display_order: number } | null
    scout_rank_requirement_progress: Array<{ id: string; status: string }>
  }

  const rankProgress = (rankProgressData || []) as RankProgress[]

  // Get merit badge progress
  const { data: meritBadgeData } = await supabase
    .from('scout_merit_badge_progress')
    .select('id, scout_id, status')
    .in('scout_id', scouts.map((s) => s.id))

  interface MeritBadge {
    id: string
    scout_id: string
    status: string
  }

  const meritBadges = (meritBadgeData || []) as MeritBadge[]

  // Get pending approvals
  const { data: pendingApprovalsData } = await supabase
    .from('scout_rank_requirement_progress')
    .select(`
      id,
      status,
      approval_status,
      submission_notes,
      submitted_at,
      scout_rank_progress (
        id,
        scout_id,
        scouts (
          id,
          first_name,
          last_name
        ),
        bsa_ranks (
          name
        )
      ),
      bsa_rank_requirements (
        requirement_number,
        description
      )
    `)
    .eq('approval_status', 'pending_approval')
    .order('submitted_at', { ascending: false })

  interface PendingApproval {
    id: string
    status: string
    approval_status: string | null
    submission_notes: string | null
    submitted_at: string | null
    scout_rank_progress: {
      id: string
      scout_id: string
      scouts: { id: string; first_name: string; last_name: string } | null
      bsa_ranks: { name: string } | null
    } | null
    bsa_rank_requirements: { requirement_number: string; description: string } | null
  }

  const pendingApprovals = (pendingApprovalsData || []) as PendingApproval[]

  // Calculate statistics
  const inProgressRanks = rankProgress.filter((r) => r.status === 'in_progress')
  const totalInProgressRequirements = inProgressRanks.reduce(
    (sum, r) => sum + r.scout_rank_requirement_progress.length,
    0
  )
  const completedRequirements = inProgressRanks.reduce(
    (sum, r) =>
      sum +
      r.scout_rank_requirement_progress.filter(
        (req) => req.status === 'completed' || req.status === 'approved' || req.status === 'awarded'
      ).length,
    0
  )
  const avgProgressPercent =
    totalInProgressRequirements > 0
      ? Math.round((completedRequirements / totalInProgressRequirements) * 100)
      : 0

  const inProgressBadges = meritBadges.filter((b) => b.status === 'in_progress').length
  const earnedBadges = meritBadges.filter((b) => b.status === 'awarded').length

  // Build scout progress map
  const scoutProgressMap = new Map<
    string,
    {
      currentRank: RankProgress | null
      completedCount: number
      totalCount: number
      progressPercent: number
    }
  >()

  for (const scout of scouts) {
    const scoutRanks = rankProgress.filter((r) => r.scout_id === scout.id)
    const inProgressRank = scoutRanks.find((r) => r.status === 'in_progress')

    if (inProgressRank) {
      const completed = inProgressRank.scout_rank_requirement_progress.filter(
        (req) => req.status === 'completed' || req.status === 'approved' || req.status === 'awarded'
      ).length
      const total = inProgressRank.scout_rank_requirement_progress.length
      scoutProgressMap.set(scout.id, {
        currentRank: inProgressRank,
        completedCount: completed,
        totalCount: total,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      })
    } else {
      scoutProgressMap.set(scout.id, {
        currentRank: null,
        completedCount: 0,
        totalCount: 0,
        progressPercent: 0,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Advancement</h1>
          <p className="text-stone-500">Track rank progress, merit badges, and activities</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/advancement/ranks">
              <BookOpen className="mr-2 h-4 w-4" />
              Rank Requirements
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/advancement/merit-badges">
              <Medal className="mr-2 h-4 w-4" />
              Merit Badges
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rank Progress</CardTitle>
            <Star className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgressPercent}% avg</div>
            <p className="text-xs text-stone-500">
              {inProgressRanks.length} scouts working on ranks
            </p>
            <Progress value={avgProgressPercent} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merit Badges</CardTitle>
            <Award className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressBadges} in progress</div>
            <p className="text-xs text-stone-500">{earnedBadges} earned this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals.length}</div>
            <p className="text-xs text-stone-500">awaiting leader review</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Parent Submissions
            </CardTitle>
            <CardDescription>
              Review and approve requirement completions submitted by parents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.slice(0, 5).map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-start justify-between rounded-lg border bg-amber-50/50 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-900">
                        {approval.scout_rank_progress?.scouts?.first_name}{' '}
                        {approval.scout_rank_progress?.scouts?.last_name}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {approval.scout_rank_progress?.bsa_ranks?.name}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      <span className="font-medium">
                        Req {approval.bsa_rank_requirements?.requirement_number}:
                      </span>{' '}
                      {approval.bsa_rank_requirements?.description?.substring(0, 100)}
                      {(approval.bsa_rank_requirements?.description?.length || 0) > 100 && '...'}
                    </p>
                    {approval.submission_notes && (
                      <p className="mt-1 text-sm italic text-stone-500">
                        &quot;{approval.submission_notes}&quot;
                      </p>
                    )}
                    {approval.submitted_at && (
                      <p className="mt-1 text-xs text-stone-400">
                        Submitted {new Date(approval.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/scouts/${approval.scout_rank_progress?.scout_id}`}
                    className="ml-4 shrink-0 text-sm text-forest-600 hover:text-forest-800"
                  >
                    Review
                  </Link>
                </div>
              ))}
              {pendingApprovals.length > 5 && (
                <p className="text-center text-sm text-stone-500">
                  + {pendingApprovals.length - 5} more pending
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scout Rank Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-stone-400" />
            Scout Rank Progress
          </CardTitle>
          <CardDescription>Overview of all scouts&apos; advancement status</CardDescription>
        </CardHeader>
        <CardContent>
          {scouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-stone-500">
                    <th className="pb-3 pr-4">Scout</th>
                    <th className="pb-3 pr-4">Patrol</th>
                    <th className="pb-3 pr-4">Current Rank</th>
                    <th className="pb-3 pr-4">Working On</th>
                    <th className="pb-3 pr-4">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {scouts.map((scout) => {
                    const progress = scoutProgressMap.get(scout.id)
                    return (
                      <tr key={scout.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/scouts/${scout.id}`}
                            className="font-medium text-stone-900 hover:text-forest-600"
                          >
                            {scout.first_name} {scout.last_name}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-stone-600">
                          {scout.patrols?.name || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className="text-xs">
                            {scout.rank || 'None'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-stone-600">
                          {progress?.currentRank?.bsa_ranks?.name || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {progress?.currentRank ? (
                            <div className="flex items-center gap-2">
                              <Progress
                                value={progress.progressPercent}
                                className="h-2 w-20"
                              />
                              <span className="text-xs text-stone-500">
                                {progress.completedCount}/{progress.totalCount}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-stone-500">No active scouts found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
