import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AccessDeniedProps {
  title?: string
  message?: string
}

export function AccessDenied({
  title = 'Access Denied',
  message = "You don't have permission to view this page.",
}: AccessDeniedProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
