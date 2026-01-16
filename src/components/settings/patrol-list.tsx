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
  display_order: number | null
  is_active: boolean | null
  unit_id: string
}

interface PatrolListProps {
  unitId: string
  patrols: Patrol[]
}

export function PatrolList({ unitId, patrols }: PatrolListProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [newPatrolName, setNewPatrolName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingPatrol, setDeletingPatrol] = useState<Patrol | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedPatrols = patrols.sort((a, b) => {
    const orderA = a.display_order ?? 0
    const orderB = b.display_order ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })

  const handleAddPatrol = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatrolName.trim()) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from('patrols').insert({
      unit_id: unitId,
      name: newPatrolName.trim(),
      display_order: patrols.length,
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
    const { error: updateError } = await supabase
      .from('patrols')
      .update({ name: editingName.trim() })
      .eq('id', editingId)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('A patrol with this name already exists')
      } else {
        setError(updateError.message)
      }
      setIsLoading(false)
      return
    }

    setEditingId(null)
    setEditingName('')
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
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
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
            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
              {sortedPatrols.map((patrol) => (
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

          {isAdding ? (
            <form onSubmit={handleAddPatrol} className="space-y-3">
              <Input
                value={newPatrolName}
                onChange={(e) => setNewPatrolName(e.target.value)}
                placeholder="Enter patrol name (e.g., Eagle, Wolf)"
                autoFocus
                disabled={isLoading}
              />
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
