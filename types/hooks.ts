export interface BaseManagerState {
  isLoading: boolean
  error: string | null
}

export interface CrudOperations<T, CreateData, UpdateData> {
  items: T[]
  create: (data: CreateData) => Promise<void>
  update: (id: string, data: UpdateData) => Promise<void>
  delete: (id: string) => Promise<void>
  refresh: () => Promise<void>
}