/**
 * PDFStatementUpload component for uploading bank statements in PDF format.
 * Not working yet
 */
'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { 
  Upload, 
  FileText, 
  X,
} from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { toast } from 'sonner'

interface PDFStatementUploadProps {
  onSuccess?: () => void
  defaultAccountId?: string
}

interface UploadPreview {
  statement: {
    bank_name: string
    account_number: string
    statement_period_start: string
    statement_period_end: string
    opening_balance: number
    closing_balance: number
    total_transactions: number
  }
  transactions: Array<{
    date: string
    description: string
    amount: number
    type: 'INCOME' | 'EXPENSE'
    balance?: number
  }>
  duplicates: Array<{
    transaction_id: string
    similarity: number
    reason: string
  }>
  warnings: string[]
}

interface PDFExtractionLog {
  checksum: string
  metadata: {
    pages: number
    fileSize: number
    version?: string
    processed: string
  }
  bankDetection: {
    detectedBank: string
    confidence: number
    method: string
  }
  warnings: string[]
  rawText: string
}

interface UploadResponse {
  success: boolean
  preview?: UploadPreview
  tempFileId?: string
  pdfExtractionLog?: PDFExtractionLog
  error?: string
}

export function PDFStatementUpload({ onSuccess, defaultAccountId }: PDFStatementUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId || '')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<UploadPreview | null>(null)
  const [pdfExtractionLog, setPdfExtractionLog] = useState<PDFExtractionLog | null>(null)
  const [tempFileId, setTempFileId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { accounts, loading: accountsLoading } = useAccounts()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find(file => file.type === 'application/pdf')
    
    if (pdfFile) {
      setSelectedFile(pdfFile)
    } else {
      toast.error('Please select a PDF file')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file)
      } else {
        toast.error('Please select a PDF file')
      }
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile || !selectedAccountId) {
      toast.error('Please select a file and account')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
  }

  const handleConfirmImport = async (skipDuplicates: boolean = true) => {
    if (!tempFileId || !previewData || !selectedAccountId) {
      toast.error('Missing required data for import')
      return
    }

    try {
      const response = await fetch('/api/statements/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempFileId,
          accountId: selectedAccountId,
          transactions: previewData.transactions,
          skipDuplicates,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      toast.success(`Successfully imported ${result.summary.imported} transactions`)
      setShowPreview(false)
      setSelectedFile(null)
      setPreviewData(null)
      setTempFileId(null)
      onSuccess?.()
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Import failed')
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setPreviewData(null)
    setTempFileId(null)
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Account Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
            disabled={accountsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={accountsLoading ? 'Loading...' : 'Select account'} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.type.toLowerCase().replace('_', ' ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetUpload}
                className="mt-2"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium">Drop your PDF statement here</p>
                <p className="text-sm text-gray-500">or click to browse files</p>
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                Browse Files
              </Button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <Button
          onClick={() => toast.info('Upload function is not available yet')}
          disabled={!selectedFile || !selectedAccountId || isUploading}
          className="w-full"
        >
          Upload & Process PDF
        </Button>
      </div>
    </>
  )
}