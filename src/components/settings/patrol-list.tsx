'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Patrol {
  id: string
  name: string
  display_order: number
  is_active: boolean
  unit_id: string
}

interface Section {
  id: string
  name: string
  unit_number: string
  unit_gender: 'boys' | 'girls' | null
}

interface PatrolListProps {
  unitId: string
  patrols: Patrol[]
  sections?: Section[]
}

export function PatrolList({ unitId, patrols, sections = [] }: PatrolListProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [newPatrolName, setNewPatrolName] = useState('')
  const [newPatrolSectionId, setNewPatrolSectionId] = useState<string>(
    sections.length > 0 ? sections[0].id : unitId
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingSectionId, setEditingSectionId] = useState<string>('')
  const [deletingPatrol, setDeletingPatrol] = useState<Patrol | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasSections = sections.length > 0

  // Group patrols by section
  const groupedPatrols = hasSections
    ? sections.map(section => ({
        section,
        patrols: patrols
          .filter(p => p.unit_id === section.id)
          .sort((a, b) => {
            if (a.display_order !== b.display_order) return a.display_order - b.display_order
            return a.name.localeCompare(b.name)
          })
      }))
    : [{ section: null, patrols: patrols.sort((a, b) => {
        if (a.display_order !== b.display_order) return a.display_order - b.display_order
        return a.name.localeCompare(b.name)
      }) }]

  const handleAddPatrol = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatrolName.trim()) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    // Use section ID if sections exist, otherwise use parent unit ID
    const targetUnitId = hasSections ? newPatrolSectionId : unitId
    const { error: insertError } = await supabase.from('patrols').insert({
      unit_id: targetUnitId,
      name: newPatrolName.trim(),
      display_order: patrols.filter(p => p.unit_id === targetUnitId).length,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('A patrol with this name already exists')
      } else {
        setError(insertError.message)
      }
      setIsLoading(false)
      return
    }

    setNewPatrolName('')
    setIsAdding(false)
    setIsLoading(false)
    router.refresh()
  }

  const handleEditPatrol = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editingName.trim()) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const updateData: { name: string; unit_id?: string } = { name: editingName.trim() }

    // Include unit_id change if sections exist
    if (hasSections && editingSectionId) {
      updateData.unit_id = editingSectionId
    }

    const { error: updateError } = await supabase
      .from('patrols')
      .update(updateData)
      .eq('id', editingId)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('A patrol with this name already exists in that section')
      } else {
        setError(updateError.message)
      }
      setIsLoading(false)
      return
    }

    setEditingId(null)
    setEditingName('')
    setEditingSectionId('')
    setIsLoading(false)
    router.refresh()
  }

  const handleDeletePatrol = async () => {
    if (!deletingPatrol) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // First, unassign any scouts from this patrol
    await supabase
      .from('scouts')
      .update({ patrol_id: null, patrol: null })
      .eq('patrol_id', deletingPatrol.id)

    // Then delete the patrol
    const { error: deleteError } = await supabase
      .from('patrols')
      .delete()
      .eq('id', deletingPatrol.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsLoading(false)
      setDeletingPatrol(null)
      return
    }

    setDeletingPatrol(null)
    setIsLoading(false)
    router.refresh()
  }

  const startEdit = (patrol: Patrol) => {
    setEditingId(patrol.id)
    setEditingName(patrol.name)
    setEditingSectionId(patrol.unit_id)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingSectionId('')
    setError(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Patrols</CardTitle>
          <CardDescription>
            Manage the patrol groups that scouts can be assigned to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}

          {patrols.length === 0 && !isAdding ? (
            <p className="text-sm text-stone-500">
              No patrols configured yet. Add your first patrol to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {groupedPatrols.map((group, groupIndex) => (
                <div key={group.section?.id || 'default'}>
                  {/* Section header */}
                  {hasSections && group.section && (
                    <h4 className="mb-2 text-sm font-semibold text-stone-700">
                      Troop {group.section.unit_number}
                    </h4>
                  )}

                  {group.patrols.length === 0 ? (
                    <p className="text-sm text-stone-400 italic ml-2">
                      No patrols in this section
                    </p>
                  ) : (
                    <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
                      {group.patrols.map((patrol) => (
                        <li key={patrol.id} className="flex items-center justify-between p-3">
                          {editingId === patrol.id ? (
                            <form onSubmit={handleEditPatrol} className="flex flex-1 items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                placeholder="Patrol name"
                                className="flex-1"
                                autoFocus
                                disabled={isLoading}
                              />
                              {hasSections && (
                                <select
                                  value={editingSectionId}
                                  onChange={(e) => setEditingSectionId(e.target.value)}
                                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  disabled={isLoading}
                                >
                                  {sections.map((section) => (
                                    <option key={section.id} value={section.id}>
                                      Troop {section.unit_number}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <Button type="submit" size="sm" disabled={isLoading || !editingName.trim()}>
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelEdit}
                                disabled={isLoading}
                              >
                                Cancel
                              </Button>
                            </form>
                          ) : (
                            <>
                              <span className="font-medium text-stone-900">{patrol.name}</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(patrol)}
                                  disabled={isLoading}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-error hover:text-error hover:bg-error-light"
                                  onClick={() => setDeletingPatrol(patrol)}
                                  disabled={isLoading}
                                >
                                  Delete
                                </Button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdding ? (
            <form onSubmit={handleAddPatrol} className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={newPatrolName}
                  onChange={(e) => setNewPatrolName(e.target.value)}
                  placeholder="Enter patrol name (e.g., Eagle, Wolf)"
                  className="flex-1"
                  autoFocus
                  disabled={isLoading}
                />
                {hasSections && (
                  <select
                    value={newPatrolSectionId}
                    onChange={(e) => setNewPatrolSectionId(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isLoading}
                  >
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        Troop {section.unit_number}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isLoading || !newPatrolName.trim()}>
                  Add Patrol
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setNewPatrolName('')
                    setError(null)
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              disabled={isLoading || editingId !== null}
            >
              Add Patrol
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingPatrol} onOpenChange={() => setDeletingPatrol(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patrol</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deletingPatrol?.name}&quot; patrol?
              Scouts currently assigned to this patrol will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatrol}
              disabled={isLoading}
              className="bg-error hover:bg-error/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
