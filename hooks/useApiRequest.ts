import { useState, useCallback } from 'react'

export function useApiRequest<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (dynamicUrl?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(dynamicUrl || url, options)
      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`)
      }
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [url, options])

  return { data, isLoading, error, execute }
}