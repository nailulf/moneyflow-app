'use client'

import React, { useState, useRef, useMemo } from 'react'
import { 
  Upload, FileText, Loader2, Save, X, Calendar, RefreshCw, Search, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/atoms/button'
import { Card, CardContent } from '@/components/ui/molecules/card'
import { Progress } from '@/components/ui/atoms/progress'
import { Checkbox } from '@/components/ui/atoms/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/molecules/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/molecules/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/molecules/alert-dialog"
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'

import { useAccounts } from '@/contexts/AccountContext'
import { useCategories } from '@/contexts/CategoryContext'
import { useAuth } from '@/contexts/AuthContext'
import { ParsedTransaction } from '@/lib/bank-parsers/types'
import { cn } from '@/lib/utils'
import { useStatementTracking } from '@/hooks/useStatementTracking'
import { Analytics } from '@/lib/analytics/amplitude'

interface UnifiedStatementProcessorProps {
  onSuccess?: () => void
  defaultAccountId?: string
}

type ViewState = 'UPLOAD' | 'REVIEW'

export function UnifiedStatementProcessor({ 
  onSuccess,
  defaultAccountId 
}: UnifiedStatementProcessorProps) {
  const { user } = useAuth()
  const userId = user?.id || ''
  // Global State
  const [viewState, setViewState] = useState<ViewState>('UPLOAD')
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [useAI, setUseAI] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId || '')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('IDR')
  
  // Review State
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isImporting, setIsImporting] = useState(false)
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [statementMetadata, setStatementMetadata] = useState<any>(null)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  
  // Contexts
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { trackUploadStarted, trackProcessingCompleted, trackProcessingFailed, trackTransactionsImported } = useStatementTracking()
  
  const formatCurrency = (amount: number, currencyCode: string = 'IDR') => {
    try {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: currencyCode }).format(amount);
    } catch (e) {
      // Fallback to IDR if the currency code is invalid
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    }
  };

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // -- UPLOAD HANDLERS --

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    if (!selectedAccountId) {
      toast.error('Please select an account')
      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    const startTime = Date.now()
    const sessionId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const selectedAccount = accounts.find(a => a.id === selectedAccountId)

    // Track upload started
    trackUploadStarted(
      selectedFile.type || 'application/pdf',
      selectedFile.size,
      {
        accountName: selectedAccount?.name,
        accountType: selectedAccount?.type || 'unknown'
      }
    )

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('useAI', useAI.toString())
    formData.append('userId', userId)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch('/api/statements/parse', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        let errorMessage = 'Failed to process statement';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          } else {
            const text = await response.text();
            console.error('Non-JSON error response:', text);
            errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}`;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
          errorMessage = `Server Error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json()
      
      if (data.success && data.preview) {
        setTransactions(data.preview.transactions)
        setStatementMetadata(data.preview.statement)

        // Extract currency from summary, first transaction, or default to IDR
        const detectedCurrency = data.preview.summary?.currency ||
                               data.preview.transactions[0]?.currency ||
                               'IDR';
        setSelectedCurrency(detectedCurrency);

        // Select all by default
        const allIds = new Set<number>(data.preview.transactions.map((_: any, i: number) => i))
        setSelectedIds(allIds)

        // Track successful processing
        trackProcessingCompleted(sessionId, {
          bankDetected: data.preview.statement?.bank_name,
          bankMatchesSelected: true,
          confidenceScore: data.preview.summary?.confidence || 1,
          transactionsExtracted: data.preview.transactions.length,
          duplicatesFound: data.preview.summary?.duplicatesFound || 0,
          processingTime: Date.now() - startTime,
          fileType: selectedFile.type || 'application/pdf'
        })

        toast.success('Statement processed successfully')
        setViewState('REVIEW')
      }
    } catch (error) {
      console.error('Upload error:', error)

      // Track failed processing
      trackProcessingFailed(sessionId, {
        errorType: 'upload_error',
        errorMessage: error instanceof Error ? error.message : 'Upload failed',
        fileType: selectedFile.type || 'application/pdf'
      })

      toast.error(error instanceof Error ? error.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  // -- REVIEW HANDLERS --

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description.toLowerCase().includes(filter.toLowerCase()) ||
        (t.merchant && t.merchant.toLowerCase().includes(filter.toLowerCase()))
      
      const matchesType = 
        typeFilter === 'ALL' || 
        (typeFilter === 'INCOME' && t.amount > 0) || 
        (typeFilter === 'EXPENSE' && t.amount < 0)

      return matchesSearch && matchesType
    })
  }, [transactions, filter, typeFilter])

  const groupedCategories = useMemo(() => {
    const groups = {
      INCOME: [] as typeof categories,
      EXPENSE: [] as typeof categories,
      TRANSFER: [] as typeof categories
    }
    
    categories.forEach(c => {
      const type = c.group_type || 'EXPENSE'
      if (groups[type]) {
        groups[type].push(c)
      } else {
        groups.EXPENSE.push(c)
      }
    })
    
    return groups
  }, [categories])

  const updateTransaction = (index: number, updates: Partial<ParsedTransaction>) => {
    setTransactions(prev => {
      const newTransactions = [...prev]
      newTransactions[index] = { ...newTransactions[index], ...updates }
      return newTransactions
    })
  }

  const handleAutoCategorize = async () => {
    if (filteredTransactions.length === 0) return

    Analytics.track('Auto Categorize Clicked', {
      transactions_count: filteredTransactions.length,
      categories_count: categories.length
    })

    setIsCategorizing(true)
    try {
      // Prepare payload for AI categorization API
      const payload = {
        transactions: filteredTransactions.map((t, i) => ({
          id: i,
          description: t.description,
          amount: t.amount,
          date: t.date
        })),
        categories: categories.map(c => ({ id: c.id, name: c.name }))
      }

      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Categorization failed')

      const { assignments } = await res.json()

      setTransactions(prev => {
        const newTrans = [...prev]
        assignments.forEach((assignment: any) => {
          // Find the transaction by index/id
          if (newTrans[assignment.id]) {
             newTrans[assignment.id] = {
               ...newTrans[assignment.id],
               category_id: assignment.categoryId,
               isAiSuggested: true
             }
          }
        })
        return newTrans
      })

      Analytics.track('Auto Categorize Completed', {
        transactions_categorized: assignments.length,
        total_transactions: filteredTransactions.length
      })

      toast.success(`Categorized ${assignments.length} transactions`)
    } catch (error) {
      console.error('Auto-categorize error:', error)
      Analytics.track('Auto Categorize Failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        transactions_count: filteredTransactions.length
      })
      toast.error('Failed to auto-categorize')
    } finally {
      setIsCategorizing(false)
    }
  }

  const handleConfirmImport = async () => {
    const transactionsToImport = transactions.filter((_, i) => selectedIds.has(i))
    
    if (transactionsToImport.length === 0) {
      toast.error('No transactions selected')
      return
    }

    setIsImporting(true)
    try {
      // Validate transactions before sending
      const validTransactions = transactionsToImport.map(t => {
        if (!t.date) throw new Error('Some transactions have missing dates')
        if (!t.description) throw new Error('Some transactions have missing descriptions')
        
        return {
          ...t,
          account_id: selectedAccountId,
          user_id: userId,
          // Ensure date is ISO string
          date: new Date(t.date).toISOString(),
          // Ensure category_id is undefined if empty/null
          category_id: t.category_id || undefined,
          // Ensure amount is absolute value based on type logic if needed, 
          // but we trust the UI state which separates amount and type
          amount: Math.abs(t.amount) * (t.type === 'EXPENSE' ? -1 : 1)
        }
      })

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTransactions)
      })

      let result;
      try {
        result = await response.json();
      } catch (e) {
        if (!response.ok) {
           const text = await response.text().catch(() => '');
           throw new Error(`Import failed (${response.status}): ${text.slice(0, 100)}`);
        }
        throw new Error('Invalid server response (not JSON)');
      }

      if (!response.ok) {
        console.error('Import failed:', result)
        throw new Error(result.error || result.details || 'Failed to import transactions')
      }

      const importedCount = result.count || result.length || 0
      const selectedAccount = accounts.find(a => a.id === selectedAccountId)

      // Track successful import
      trackTransactionsImported(`import-${Date.now()}`, {
        importedCount,
        accountId: selectedAccountId,
        accountName: selectedAccount?.name || 'Unknown',
        bankName: statementMetadata?.bank_name,
        totalAmount: transactionsToImport.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      })

      toast.success(`Successfully imported ${importedCount} transactions`)

      if (onSuccess) onSuccess()
      
      // Reset state if not unmounted
      setViewState('UPLOAD')
      setSelectedFile(null)
      setTransactions([])
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import transactions')
    } finally {
      setIsImporting(false)
    }
  }

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map((_, i) => i)))
    }
  }

  // -- RENDER HELPERS --

  const renderUploadState = () => (
    <div className="space-y-6 p-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => {
          Analytics.track('Statement Upload Area Clicked', {
            has_existing_file: !!selectedFile
          })
          fileInputRef.current?.click()
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf" 
          onChange={handleFileSelect}
        />
        
        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-10 w-10 text-primary" />
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm leading-body-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Drop your PDF statement here</p>
            <p className="text-sm leading-body-sm text-muted-foreground">or click to browse</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>Select Account</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose account..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="use-ai" 
            checked={useAI} 
            onCheckedChange={(c) => setUseAI(!!c)} 
          />
          <Label htmlFor="use-ai" className="cursor-pointer">
            Use AI for enhanced extraction & categorization
          </Label>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-xs leading-caption text-center text-muted-foreground">Processing statement...</p>
          </div>
        )}

        <Button 
          className="w-full" 
          onClick={handleUpload} 
          disabled={!selectedFile || !selectedAccountId || isUploading}
        >
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload & Process
        </Button>
      </div>
    </div>
  )

  const renderReviewDialog = (): React.ReactElement => (
    <>
      <Dialog open={viewState === 'REVIEW'} onOpenChange={(open) => {
        if (!open && !isImporting) {
          setShowExitConfirmation(true)
        }
      }}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[70vh] flex flex-col p-0 gap-0 sm:max-w-[80vw] transition-all duration-300">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle>Review Transactions</DialogTitle>
            <DialogDescription>
              {selectedIds.size} of {transactions.length} selected. Review and edit before importing.
            </DialogDescription>
          </DialogHeader>

        {/* Global Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center space-x-2">
            <Label className="w-20 font-medium">Account:</Label>
             <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="flex-1 bg-background h-9">
                  <SelectValue placeholder="Choose account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div className="flex items-center space-x-2">
             <Label className="w-20 font-medium">Currency:</Label>
             <Select 
                value={selectedCurrency} 
                onValueChange={(val) => {
                    setSelectedCurrency(val);
                    // Update all transactions with new currency
                    setTransactions(prev => prev.map(t => ({ ...t, currency: val })));
                }}
             >
                <SelectTrigger className="flex-1 bg-background h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center p-4 border-b bg-muted/10 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search description or merchant..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger className="w-[130px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="INCOME">Income Only</SelectItem>
              <SelectItem value="EXPENSE">Expense Only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={handleAutoCategorize} disabled={isCategorizing}>
            {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Re-categorize
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-background border-t">
          {/* Header Row */}
          <div className="sticky top-0 z-10 grid grid-cols-[40px_130px_100px_minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_160px_120px] gap-2 p-3 bg-muted/90 backdrop-blur border-b font-medium text-xs uppercase text-muted-foreground items-center min-w-[1000px]">
            <div className="flex items-center justify-center">
              <Checkbox 
                checked={selectedIds.size === transactions.length && transactions.length > 0}
                onCheckedChange={toggleAll}
              />
            </div>
            <div>Date</div>
            <div>Type</div>
            <div>Description</div>
            <div>Merchant</div>
            <div>Notes</div>
            <div>Category</div>
            <div className="text-right">Amount</div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground min-w-[1000px]">
              <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p className="text-lg leading-title-5 font-medium">No transactions found</p>
              <p className="text-sm leading-body-sm">
                {transactions.length === 0 
                  ? "We couldn't extract any transactions from the uploaded file." 
                  : "Try adjusting your filters to see more results."}
              </p>
            </div>
          ) : (
            <div className="min-w-[1000px]">
              {filteredTransactions.map((t, index) => {
                const originalIndex = transactions.indexOf(t)
                const isSelected = selectedIds.has(originalIndex)
                const hasError = !t.description || !t.amount || isNaN(t.amount) || !t.date

                return (
                  <div
                    key={`${index}-${originalIndex}`}
                    className={cn(
            "grid grid-cols-[40px_130px_100px_minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_160px_120px] gap-2 p-2 border-b transition-colors text-sm items-center hover:bg-muted/50",
            isSelected ? "bg-primary/5" : "bg-background",
                      hasError && "bg-destructive/10"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-center">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(originalIndex)}
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <Input 
                        type="date" 
                        value={t.date} 
                        onChange={(e) => updateTransaction(originalIndex, { date: e.target.value })}
                        className="h-8 w-full"
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <Select 
                        value={t.type || (t.amount >= 0 ? 'INCOME' : 'EXPENSE')} 
                        onValueChange={(val: any) => {
                          const newSign = val === 'EXPENSE' ? -1 : 1;
                          const currentAbsAmount = Math.abs(t.amount);
                          updateTransaction(originalIndex, { 
                              type: val,
                              amount: currentAbsAmount * newSign
                          })
                        }}
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">Income</SelectItem>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="TRANSFER">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div>
                      <Input 
                        value={t.description} 
                        onChange={(e) => updateTransaction(originalIndex, { description: e.target.value })}
                        className={cn("h-8 w-full", !t.description && "border-destructive")}
                        placeholder="Description"
                      />
                    </div>

                    {/* Merchant */}
                    <div>
                      <Input 
                        value={t.merchant || ''} 
                        onChange={(e) => updateTransaction(originalIndex, { merchant: e.target.value })}
                        className="h-8 w-full"
                        placeholder="Merchant"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <Input 
                        value={t.notes || ''} 
                        onChange={(e) => updateTransaction(originalIndex, { notes: e.target.value })}
                        className="h-8 w-full"
                        placeholder="Notes"
                      />
                    </div>

                    {/* Category */}
                    <div>
                       <Select 
                         value={t.category_id || "uncategorized"} 
                         onValueChange={(val) => updateTransaction(originalIndex, { category_id: val === "uncategorized" ? undefined : val })}
                       >
                        <SelectTrigger className={cn("h-8 w-full", !t.category_id && "text-muted-foreground")}>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uncategorized">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                              Uncategorized
                            </span>
                          </SelectItem>
                          
                          {groupedCategories.EXPENSE.length > 0 && (
                            <>
                              <SelectSeparator />
                              <SelectGroup>
                                <SelectLabel>Expenses</SelectLabel>
                                {groupedCategories.EXPENSE.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <span className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || 'hsl(var(--muted))' }} />
                                      {c.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </>
                          )}

                          {groupedCategories.INCOME.length > 0 && (
                            <>
                              <SelectSeparator />
                              <SelectGroup>
                                <SelectLabel>Income</SelectLabel>
                                {groupedCategories.INCOME.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <span className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || 'hsl(var(--muted))' }} />
                                      {c.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </>
                          )}

                          {groupedCategories.TRANSFER.length > 0 && (
                            <>
                              <SelectSeparator />
                              <SelectGroup>
                                <SelectLabel>Transfers</SelectLabel>
                                {groupedCategories.TRANSFER.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <span className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || 'hsl(var(--muted))' }} />
                                      {c.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="flex flex-col items-end">
                         <Input
                            type="number"
                            value={Math.abs(t.amount)}
                            onChange={(e) => {
                               const val = parseFloat(e.target.value);
                               // Maintain sign based on type or current amount
                               const sign = t.type === 'EXPENSE' ? -1 : 1;
                               updateTransaction(originalIndex, { amount: Math.abs(val) * sign });
                            }}
                            className="h-8 w-24 text-right mb-1"
                            step="0.01"
                         />
                         <span 
                            data-testid="amount-display"
                            className={cn("text-xs leading-caption font-medium", t.amount > 0 ? "text-success" : "text-destructive")}
                         >
                            {formatCurrency(t.amount, t.currency)}
                         </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 shrink-0">
            <div className="flex justify-between w-full items-center">
              <div className="text-sm leading-body-sm text-muted-foreground flex gap-4">
                  <span>Selected: {selectedIds.size}</span>
                  {selectedIds.size > 0 && (
                      <span>
                        Total: {formatCurrency(
                          transactions
                            .filter((_, i) => selectedIds.has(i))
                            .reduce((acc, t) => acc + t.amount, 0)
                        )}
                      </span>
                  )}
              </div>
              <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    Analytics.track('Statement Import Cancel Clicked', {
                      transactions_count: transactions.length,
                      selected_count: selectedIds.size
                    })
                    setShowExitConfirmation(true)
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmImport} disabled={isImporting || selectedIds.size === 0}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Add transactions
                  </Button>
              </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to close? Unsaved progress will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            Analytics.track('Statement Import Discard Cancelled', {
              transactions_count: transactions.length
            })
          }}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            Analytics.track('Statement Import Discarded', {
              transactions_count: transactions.length,
              selected_count: selectedIds.size
            })
            setViewState('UPLOAD')
            setShowExitConfirmation(false)
          }}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )

  return (
    <>
      <Card className="w-full h-full border-0 shadow-none">
        <CardContent className="p-0 h-full">
          {renderUploadState()}
        </CardContent>
      </Card>
      {renderReviewDialog()}
    </>
  )
}
