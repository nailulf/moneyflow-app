import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import FileUpload from '@/components/upload/file-upload'
import AppLayout from '@/components/layout/app-layout'

export default async function UploadPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  return (
    <AppLayout>
          <FileUpload />
    </AppLayout>
  )
}