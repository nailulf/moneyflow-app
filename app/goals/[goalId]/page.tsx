'use client'

import { useParams } from 'next/navigation'
import { GoalDetailScreen } from '@/components/features/goals/GoalDetailScreen'

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>()
  return <GoalDetailScreen goalId={goalId} />
}
