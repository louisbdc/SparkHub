'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/workspaces/${id}/kanban`)
  }, [id, router])

  return null
}
