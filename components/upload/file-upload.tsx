'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload } from 'lucide-react'
import Papa from 'papaparse'

interface Transaction {
  description: string
  amount: number
  date: string
  category: string
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const processCSV = (file: File): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const transactions: Transaction[] = results.data.map((row: any) => ({
            description: row.description || row.Description || '',
            amount: parseFloat(row.amount || row.Amount || '0'),
            date: row.date || row.Date || new Date().toISOString().split('T')[0],
            category: 'Other'
          }))
          resolve(transactions.filter(t => t.description && t.amount))
        },
        error: reject
      })
    })
  }

  const handleUpload = async () => {
    if (!file) return
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let transactions: Transaction[] = []
      
      if (file.type === 'text/csv') {
        transactions = await processCSV(file)
      } else {
        // For PDF processing, you'd implement PDF parsing here
        // For now, we'll show a placeholder
        alert('PDF processing not implemented in this demo')
        return
      }

      // Insert transactions into database
      const { error } = await supabase
        .from('transactions')
        .insert(
          transactions.map(t => ({
            ...t,
            user_id: user.id
          }))
        )

      if (error) throw error
      
      alert(`Successfully uploaded ${transactions.length} transactions!`)
      router.push('/transactions')
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Bank Statement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600">
                Click to upload CSV or PDF files
              </p>
            </div>
          </label>
        </div>
        
        {file && (
          <div className="text-sm text-gray-600">
            Selected: {file.name}
          </div>
        )}
        
        <Button 
          onClick={handleUpload} 
          disabled={!file || loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Upload & Process'}
        </Button>
      </CardContent>
    </Card>
  )
}