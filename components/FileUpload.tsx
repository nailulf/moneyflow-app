'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface FileUploadProps {
  onFileProcessed?: (transactions: any[]) => void
}

interface UploadedFile {
  file: File
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

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
  }, [])

  const simulateFileProcessing = async (uploadedFile: UploadedFile, index: number) => {
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
      const mockTransactions = [
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
          i === fileIndex ? { 
            ...f, 
            status: 'error', 
            error: 'Failed to process file. Please check the format.' 
          } : f
        )
      )
      toast.error(`Failed to process ${uploadedFile.file.name}`)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <File className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusText = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
        return `Uploading... ${file.progress}%`
      case 'processing':
        return `Processing... ${file.progress}%`
      case 'completed':
        return 'Completed'
      case 'error':
        return file.error || 'Error'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Bank Statements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag & drop your bank statements here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, CSV, XLS, XLSX files up to 10MB
              </p>
            </div>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Uploaded Files</h4>
            {uploadedFiles.map((uploadedFile, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                {getStatusIcon(uploadedFile.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getStatusText(uploadedFile)}
                  </p>
                  {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0"
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