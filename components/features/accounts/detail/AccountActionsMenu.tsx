'use client'

import { useTranslations } from 'next-intl'
import { MoreVertical, Edit, Download, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/molecules/dropdown-menu'

interface Props {
  onEdit: () => void
  onExport: () => void
  onDelete: () => void
}

export function AccountActionsMenu({ onEdit, onExport, onDelete }: Props) {
  const t = useTranslations('accountDetail')
  // modal={false}: a menu item here opens a Dialog (Edit/Delete). A *modal* dropdown
  // locks the body (pointer-events:none); when its teardown races the Dialog's own
  // scroll-lock, the body's pointer-events:none gets restored instead of cleared,
  // freezing the whole screen to taps (scroll still works) after the dialog closes.
  // Non-modal menu = no body lock = the Dialog captures a clean state to restore.
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t('menu.label')}
        className="flex size-9 items-center justify-center rounded-[10px] bg-card text-foreground shadow-card transition-colors hover:bg-muted/50"
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 size-4" />{t('menu.edit')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onExport}><Download className="mr-2 size-4" />{t('menu.export')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 size-4" />{t('menu.delete')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
