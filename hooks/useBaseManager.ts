import { useCallback, useState } from "react"
import { toast } from "sonner"

export function useBaseManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorPrefix: string = 'Operation failed'
  ): Promise<T | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await operation()
      if (successMessage) {
        toast.success(successMessage)
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : errorPrefix
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isLoading, error, handleAsync, setError }
}