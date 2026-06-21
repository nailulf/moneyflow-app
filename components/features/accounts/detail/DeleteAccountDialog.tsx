'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/molecules/dialog'
import { Button } from '@/components/ui/atoms/button'
import { useAccounts } from '@/contexts/AccountContext'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  onDeleted: () => void
}

export function DeleteAccountDialog({ open, onOpenChange, accountId, onDeleted }: Props) {
  const t = useTranslations('accountDetail')
  const { deleteAccount } = useAccounts()

  const handleDelete = async () => {
    try {
      await deleteAccount(accountId)
      toast.success(t('deleteDialog.title'))
      onOpenChange(false)
      onDeleted()
    } catch {
      toast.error(t('deleteDialog.title'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
          <DialogDescription>{t('deleteDialog.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('deleteDialog.cancel')}</Button>
          <Button variant="destructive" onClick={handleDelete}>{t('deleteDialog.delete')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
