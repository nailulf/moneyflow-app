'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Transaction {
  date: string
  description: string
  amount: number
  category: string
  merchant: string
}

interface FileUploadProps {
  onFileProcessed?: (transactions: Transaction[]) => void
}

interface UploadedFile {
  file: File
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const simulateFileProcessing = useCallback(async (uploadedFile: UploadedFile, index: number) => {
    const fileIndex = uploadedFiles.length + index
    
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadedFiles(prev => 
        prev.map((f, i) => 
          i === fileIndex ? { ...f, progress } : f
        )
      )
    }
    
    // Change to processing
    setUploadedFiles(prev => 
      prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'processing', progress: 0 } : f
      )
    )
    
    // Simulate processing
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadedFiles(prev => 
        prev.map((f, i) => 
          i === fileIndex ? { ...f, progress } : f
        )
      )
    }
    
    // Complete or error (90% success rate)
    const isSuccess = Math.random() > 0.1
    
    if (isSuccess) {
      setUploadedFiles(prev => 
        prev.map((f, i) => 
          i === fileIndex ? { ...f, status: 'completed', progress: 100 } : f
        )
      )
      
      // Simulate extracted transactions
      const mockTransactions: Transaction[] = [
        {
          date: new Date().toISOString().split('T')[0],
          description: `Transaction from ${uploadedFile.file.name}`,
          amount: -Math.random() * 100,
          category: 'Other',
          merchant: 'Imported'
        }
      ]
      
      onFileProcessed?.(mockTransactions)
      toast.success(`Successfully processed ${uploadedFile.file.name}`)
    } else {
      setUploadedFiles(prev => 
        prev.map((f, i) => 
          i === fileIndex ? { ...f, status: 'error', error: 'Processing failed' } : f
        )
      )
      toast.error(`Failed to process ${uploadedFile.file.name}`)
    }
  }, [uploadedFiles, onFileProcessed])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'uploading' as const,
      progress: 0
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    
    // Simulate file processing
    newFiles.forEach((uploadedFile, index) => {
      simulateFileProcessing(uploadedFile, index)
    })
  }, [simulateFileProcessing])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  })

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(file => file.file !== fileToRemove))
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Upload Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag &apos;n&apos; drop some files here, or click to select files
          </p>
          <p className="text-xs text-gray-500">(CSV, XLS, XLSX files)</p>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-3">
            {uploadedFiles.map((uploadedFile, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-md shadow-sm">
                <div className="flex items-center space-x-3">
                  {uploadedFile.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {uploadedFile.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                    <File className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{uploadedFile.file.name}</p>
                    {uploadedFile.status === 'error' && (
                      <p className="text-xs text-red-500">Error: {uploadedFile.error}</p>
                    )}
                    {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${uploadedFile.progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile.file)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}