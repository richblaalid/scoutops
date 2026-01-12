'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

interface LogoUploadProps {
  unitId: string
  currentLogoUrl: string | null
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function LogoUpload({ unitId, currentLogoUrl }: LogoUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a PNG, JPEG, or WebP image')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be smaller than 2MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)

    // Upload file
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('unitId', unitId)

    try {
      const response = await fetch('/api/settings/unit-logo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload logo')
      }

      setPreviewUrl(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/settings/unit-logo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete logo')
      }

      setShowDeleteDialog(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const displayUrl = previewUrl || currentLogoUrl

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Unit Logo</CardTitle>
          <CardDescription>
            Upload a logo to display on payment pages and emails sent to families
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex items-start gap-6">
            {/* Logo preview area */}
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50">
              {displayUrl ? (
                <Image
                  src={displayUrl}
                  alt="Unit logo"
                  width={128}
                  height={128}
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-center text-sm text-stone-400">
                  <svg
                    className="mx-auto h-8 w-8 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  No logo
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>

              {currentLogoUrl && (
                <Button
                  variant="ghost"
                  className="text-error hover:text-error hover:bg-error-light"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isUploading || isDeleting}
                >
                  Remove Logo
                </Button>
              )}

              <p className="text-xs text-stone-500">
                PNG, JPEG, or WebP. Max 2MB.<br />
                Recommended: Square image, at least 200x200px.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Logo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the unit logo? Payment pages and emails
              will no longer display your logo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-error hover:bg-error/90"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
