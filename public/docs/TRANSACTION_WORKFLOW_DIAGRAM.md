# Transaction Creation Workflow Diagram

## Complete System Flow Visualization

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🖥️ Frontend UI
    participant Form as 📝 AddTransactionForm
    participant Hook as 🔄 useTransactionManager
    participant API as 🌐 API Client
    participant Route as 🛣️ API Route
    participant Auth as 🔐 Supabase Auth
    participant DB as 🗄️ PostgreSQL
    participant RLS as 🛡️ RLS Policies

    User->>UI: Click "Add Transaction"
    UI->>Form: Open AddTransactionForm
    
    Note over Form: Form Validation Layer
    Form->>Form: Validate with Zod Schema
    
    User->>Form: Fill transaction details
    User->>Form: Submit form
    
    Form->>Hook: Call addTransaction()
    Hook->>Hook: Set loading state
    Hook->>API: Call createTransaction()
    
    Note over API: Client-side API Layer
    API->>Route: POST /api/transactions
    
    Note over Route: Server-side Processing
    Route->>Route: Validate environment variables
    Route->>Route: Parse request body
    Route->>Route: Validate with transactionFormSchema
    
    Route->>Auth: Get user from session
    Auth-->>Route: Return user data
    
    alt User not authenticated
        Route-->>API: 401 Unauthorized
        API-->>Hook: Error response
        Hook-->>Form: Display auth error
        Form-->>User: Show error message
    end
    
    Route->>Route: Add user_id to transaction data
    Route->>DB: Insert transaction
    
    Note over DB,RLS: Database Security Layer
    DB->>RLS: Check INSERT policy
    RLS->>RLS: Verify auth.uid() = user_id
    
    alt RLS policy fails
        RLS-->>DB: Access denied
        DB-->>Route: Permission error
        Route-->>API: 403 Forbidden
        API-->>Hook: Error response
        Hook-->>Form: Display permission error
        Form-->>User: Show error message
    end
    
    alt Foreign key constraint violation
        DB-->>Route: FK constraint error
        Route-->>API: 400 Bad Request
        API-->>Hook: Error response
        Hook-->>Form: Display validation error
        Form-->>User: Show error message
    end
    
    DB->>DB: Execute INSERT with constraints
    DB-->>Route: Return created transaction
    Route-->>API: 201 Created + transaction data
    API-->>Hook: Success response
    Hook->>Hook: Update local state
    Hook->>Hook: Clear loading state
    Hook-->>Form: Success callback
    Form->>Form: Reset form
    Form-->>User: Show success message
    UI->>UI: Refresh transaction list
```

## Component Interaction Flow

```mermaid
flowchart TD
    A[👤 User Action] --> B[🖥️ AddTransactionButton]
    B --> C[📝 AddTransactionForm]
    C --> D{Form Validation}
    D -->|Valid| E[🔄 useTransactionManager]
    D -->|Invalid| F[❌ Show Validation Errors]
    F --> C
    
    E --> G[🌐 createTransaction API]
    G --> H[🛣️ /api/transactions POST]
    
    H --> I{Environment Check}
    I -->|Missing Env| J[❌ 500 Server Error]
    I -->|Valid| K{Request Validation}
    
    K -->|Invalid| L[❌ 400 Bad Request]
    K -->|Valid| M[🔐 Get User Session]
    
    M --> N{User Authenticated?}
    N -->|No| O[❌ 401 Unauthorized]
    N -->|Yes| P[🗄️ Database Insert]
    
    P --> Q{RLS Policy Check}
    Q -->|Denied| R[❌ 403 Forbidden]
    Q -->|Allowed| S{Constraint Check}
    
    S -->|FK Violation| T[❌ 400 Bad Request]
    S -->|Valid| U[✅ Transaction Created]
    
    U --> V[📊 Update UI State]
    V --> W[🔄 Refresh Data]
    
    J --> X[📱 Error Display]
    L --> X
    O --> X
    R --> X
    T --> X
    X --> Y[👤 User Sees Error]
```

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Frontend Layer"
        A[AddTransactionForm]
        B[useTransactionManager]
        C[Transaction State]
    end
    
    subgraph "API Layer"
        D[createTransaction]
        E[/api/transactions]
    end
    
    subgraph "Authentication"
        F[Supabase Auth]
        G[JWT Token]
        H[User Session]
    end
    
    subgraph "Database Layer"
        I[PostgreSQL]
        J[RLS Policies]
        K[Foreign Keys]
        L[Constraints]
    end
    
    A -->|Form Data| B
    B -->|API Call| D
    D -->|HTTP POST| E
    E -->|Verify| F
    F -->|Return| G
    G -->|Session| H
    E -->|Insert| I
    I -->|Check| J
    I -->|Validate| K
    I -->|Enforce| L
    I -->|Result| E
    E -->|Response| D
    D -->|Update| C
    C -->|Render| A
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Transaction Submission] --> B{Validation Layer}
    
    B -->|Client Validation Fails| C[Zod Schema Error]
    C --> D[Form Field Errors]
    
    B -->|Server Validation Fails| E[API Schema Error]
    E --> F[400 Bad Request]
    
    B -->|Auth Fails| G[Authentication Error]
    G --> H[401 Unauthorized]
    
    B -->|Permission Fails| I[RLS Policy Error]
    I --> J[403 Forbidden]
    
    B -->|Constraint Fails| K[Database Constraint Error]
    K --> L[400 Bad Request + Details]
    
    B -->|Server Error| M[Internal Server Error]
    M --> N[500 Server Error]
    
    B -->|Success| O[201 Created]
    O --> P[Transaction Saved]
    
    D --> Q[User Feedback]
    F --> Q
    H --> Q
    J --> Q
    L --> Q
    N --> Q
    P --> R[Success Message]
```

## Security & Authorization Flow

```mermaid
sequenceDiagram
    participant Client as 🖥️ Client
    participant API as 🛣️ API Route
    participant Auth as 🔐 Supabase Auth
    participant RLS as 🛡️ RLS Engine
    participant DB as 🗄️ Database
    
    Client->>API: POST /api/transactions
    API->>Auth: Extract JWT from request
    Auth->>Auth: Validate token signature
    Auth->>Auth: Check token expiration
    
    alt Invalid or expired token
        Auth-->>API: Authentication failed
        API-->>Client: 401 Unauthorized
    end
    
    Auth->>API: Return user context
    API->>API: Add user_id to transaction
    API->>DB: Execute INSERT query
    
    DB->>RLS: Evaluate INSERT policy
    RLS->>RLS: Check: auth.uid() = NEW.user_id
    
    alt RLS policy violation
        RLS-->>DB: Access denied
        DB-->>API: Permission error
        API-->>Client: 403 Forbidden
    end
    
    RLS->>DB: Policy satisfied
    DB->>DB: Execute INSERT with constraints
    DB-->>API: Transaction created
    API-->>Client: 201 Created
```

## Database Constraint Validation

```mermaid
flowchart TD
    A[INSERT Transaction] --> B{NOT NULL Checks}
    B -->|Fails| C[❌ NULL Constraint Error]
    B -->|Passes| D{Foreign Key Checks}
    
    D -->|user_id not in auth.users| E[❌ FK Constraint: user_id]
    D -->|category_id not in categories| F[❌ FK Constraint: category_id]
    D -->|Passes| G{Data Type Checks}
    
    G -->|Invalid UUID| H[❌ Invalid UUID Format]
    G -->|Invalid DECIMAL| I[❌ Invalid Amount Format]
    G -->|Passes| J{Business Logic Checks}
    
    J -->|Amount = 0| K[❌ Zero Amount Error]
    J -->|Future Date| L[❌ Future Date Error]
    J -->|Passes| M[✅ Transaction Inserted]
    
    C --> N[Return 400 Bad Request]
    E --> N
    F --> N
    H --> N
    I --> N
    K --> N
    L --> N
    M --> O[Return 201 Created]
```

## Performance & Optimization Points

```mermaid
mindmap
  root((Transaction Performance))
    Frontend
      Form Validation
        Client-side validation
        Immediate feedback
        Reduced server calls
      State Management
        Optimistic updates
        Local caching
        Debounced inputs
      UI Optimization
        Lazy loading
        Virtual scrolling
        Memoized components
    
    API Layer
      Request Optimization
        Payload compression
        Request batching
        Connection pooling
      Response Caching
        HTTP caching headers
        CDN integration
        Edge caching
      Error Handling
        Circuit breakers
        Retry mechanisms
        Graceful degradation
    
    Database
      Query Optimization
        Proper indexing
        Query planning
        Connection pooling
      Constraint Efficiency
        Foreign key indexes
        Partial indexes
        Constraint deferring
      RLS Performance
        Policy optimization
        Index on user_id
        Efficient predicates
```

## Monitoring & Debugging Points

```mermaid
flowchart LR
    subgraph "Frontend Monitoring"
        A[Form Errors]
        B[API Response Times]
        C[User Interactions]
    end
    
    subgraph "API Monitoring"
        D[Request Logs]
        E[Error Rates]
        F[Response Times]
    end
    
    subgraph "Database Monitoring"
        G[Query Performance]
        H[Constraint Violations]
        I[RLS Policy Hits]
    end
    
    subgraph "Error Tracking"
        J[Client Errors]
        K[Server Errors]
        L[Database Errors]
    end
    
    A --> J
    B --> F
    C --> D
    D --> K
    E --> K
    F --> K
    G --> L
    H --> L
    I --> L
    
    J --> M[Error Dashboard]
    K --> M
    L --> M
```

## Key Integration Points

### 1. Frontend ↔ API Integration
- **Request Format**: JSON with specific schema validation
- **Authentication**: JWT token in Authorization header
- **Error Handling**: Structured error responses with specific codes
- **State Management**: Optimistic updates with rollback on failure

### 2. API ↔ Database Integration
- **Connection**: Supabase client with service role key
- **Security**: RLS policies enforced at database level
- **Transactions**: ACID compliance for data integrity
- **Constraints**: Foreign key relationships maintained

### 3. Authentication Integration
- **Session Management**: Supabase Auth handles JWT lifecycle
- **User Context**: Extracted from token and injected into queries
- **Permission Model**: RLS policies based on authenticated user ID
- **Security**: Token validation and expiration handling

### 4. Error Propagation Chain
1. **Database Errors** → Constraint violations, RLS denials
2. **API Errors** → Validation failures, authentication issues
3. **Client Errors** → Network issues, form validation
4. **User Feedback** → Contextual error messages and recovery options

This comprehensive workflow diagram illustrates the complete transaction creation process, highlighting all system interactions, security checkpoints, and potential failure points in the MoneyFlow application.