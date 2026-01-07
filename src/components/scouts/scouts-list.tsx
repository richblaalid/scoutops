'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ScoutForm } from './scout-form'

interface Scout {
  id: string
  first_name: string
  last_name: string
  patrol: string | null
  rank: string | null
  is_active: boolean | null
  date_of_birth: string | null
  bsa_member_id: string | null
  scout_accounts: { id: string; balance: number | null } | null
}

interface ScoutsListProps {
  scouts: Scout[]
  canManage: boolean
  unitId: string
}

export function ScoutsList({ scouts, canManage, unitId }: ScoutsListProps) {
  const [editingScout, setEditingScout] = useState<Scout | null>(null)
  if (scouts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No scouts in your unit yet.</p>
        {canManage && (
          <p className="mt-2 text-sm text-gray-400">
            Click &quot;Add Scout&quot; to add your first scout.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm font-medium text-gray-500">
            <th className="pb-3 pr-4">Name</th>
            <th className="pb-3 pr-4">Patrol</th>
            <th className="pb-3 pr-4">Rank</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4 text-right">Balance</th>
            {canManage && <th className="pb-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {scouts.map((scout) => {
            const balance = scout.scout_accounts?.balance ?? 0
            const accountId = scout.scout_accounts?.id

            return (
              <tr key={scout.id} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {scout.first_name} {scout.last_name}
                    </p>
                    {scout.bsa_member_id && (
                      <p className="text-xs text-gray-500">BSA# {scout.bsa_member_id}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-600">{scout.patrol || '—'}</td>
                <td className="py-3 pr-4 text-gray-600">{scout.rank || '—'}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      scout.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {scout.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span
                    className={`font-medium ${
                      balance < 0 ? 'text-red-600' : balance > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    {formatCurrency(balance)}
                  </span>
                </td>
                {canManage && (
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/scouts/${scout.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setEditingScout(scout)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {accountId && (
                        <Link
                          href={`/accounts/${accountId}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Account
                        </Link>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {editingScout && (
        <ScoutForm
          unitId={unitId}
          scout={{
            id: editingScout.id,
            first_name: editingScout.first_name,
            last_name: editingScout.last_name,
            patrol: editingScout.patrol,
            rank: editingScout.rank,
            date_of_birth: editingScout.date_of_birth,
            bsa_member_id: editingScout.bsa_member_id,
            is_active: editingScout.is_active,
          }}
          onClose={() => setEditingScout(null)}
          onSuccess={() => {
            setEditingScout(null)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
