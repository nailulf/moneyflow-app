


          
# Creating New APIs in MoneyFlow App Architecture

To create new APIs following the established architecture, you need to implement both server-side routes and client-side utilities:

## Step 1: Create Server-Side API Route (`/app/api/`)

Create a new folder in <mcfolder name="app/api" path="/Users/nailul.fadloil/Documents/Personal spaces/moneyflow-app/app/api"></mcfolder> with a `route.ts` file:

```typescript
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Environment check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }
    
    const supabase = createServerComponentClient()
    
    // Your database query logic here
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Similar structure for POST operations
}

export async function PUT(request: NextRequest) {
  // Similar structure for PUT operations
}

export async function DELETE(request: NextRequest) {
  // Similar structure for DELETE operations
}
```

## Step 2: Create Client-Side API Utility (`/lib/api/`)

Create a corresponding utility file in <mcfolder name="lib/api" path="/Users/nailul.fadloil/Documents/Personal spaces/moneyflow-app/lib/api"></mcfolder>:

```typescript
// lib/api/your-endpoint.ts
import { YourType, YourInsert, YourUpdate } from '@/types/database'

// Request deduplication cache
const requestCache = new Map<string, Promise<YourType[]>>()
const dataCache = new Map<string, { data: YourType[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

export async function getUserData(userId: string): Promise<YourType[]> {
  const cacheKey = `your-endpoint-${userId}`
  
  // Check data cache first
  const cached = dataCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  // Check if request is already in progress
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!
  }
  
  // Create new request
  const requestPromise = (async () => {
    try {
      const response = await fetch(`/api/your-endpoint?userId=${userId}`)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error fetching data:', error)
        throw new Error('Failed to fetch data')
      }
      
      const data = await response.json()
      
      // Cache the result
      dataCache.set(cacheKey, { data, timestamp: Date.now() })
      
      return data
    } finally {
      // Remove from request cache when done
      requestCache.delete(cacheKey)
    }
  })()
  
  // Store the promise to prevent duplicate requests
  requestCache.set(cacheKey, requestPromise)
  
  return requestPromise
}

export async function createData(data: YourInsert): Promise<YourType> {
  const response = await fetch('/api/your-endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create data')
  }
  
  return response.json()
}

export async function updateData(id: string, updates: YourUpdate): Promise<YourType> {
  const response = await fetch('/api/your-endpoint', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update data')
  }
  
  return response.json()
}

export async function deleteData(id: string): Promise<void> {
  const response = await fetch('/api/your-endpoint', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete data')
  }
}
```

## Step 3: Update Type Definitions

Add your types to <mcfile name="database.ts" path="/Users/nailul.fadloil/Documents/Personal spaces/moneyflow-app/types/database.ts"></mcfile>:

```typescript
export interface YourType {
  id: string
  user_id: string
  // ... other fields
  created_at: string
  updated_at: string
}

export interface YourInsert {
  user_id: string
  // ... required fields for creation
}

export interface YourUpdate {
  // ... optional fields for updates
}
```

## Step 4: Use in Components

Import and use the client-side utilities in your React components:

```typescript
import { getUserData, createData } from '@/lib/api/your-endpoint'

// In your component
const data = await getUserData(userId)
```

## Key Architecture Benefits

- **Separation of Concerns**: Server routes handle HTTP/database logic, client utilities handle caching/requests
- **Type Safety**: Full TypeScript support throughout the data flow
- **Performance**: Built-in request deduplication and caching (30-second cache)
- **Error Handling**: Consistent error patterns across all endpoints
- **Scalability**: Easy to extend with additional methods and functionality

This pattern ensures consistency with existing APIs like <mcfile name="route.ts" path="/Users/nailul.fadloil/Documents/Personal spaces/moneyflow-app/app/api/categories/route.ts"></mcfile> and <mcfile name="categories.ts" path="/Users/nailul.fadloil/Documents/Personal spaces/moneyflow-app/lib/api/categories.ts"></mcfile>, maintaining the established architectural standards.
        