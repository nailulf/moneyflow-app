# BCA PDF Parser - Enhanced Product Requirements Document

**Feature**: Bank Statement PDF Parser with Advanced Processing Pipeline  
**Product Context**: Next.js + Supabase MoneyFlow App  
**Version**: 2.0 (Enhanced)  
**Last Updated**: December 2024

---

## 1. Executive Summary

Build a comprehensive **bank-specific PDF parser service** that provides secure file upload, intelligent PDF structure analysis, transaction extraction with duplicate detection, user preview and editing capabilities, and validated database persistence. The system prioritizes user control, data accuracy, and seamless integration with the existing MoneyFlow architecture.

### Key Enhancements
- **Secure File Upload**: Multi-layer validation and temporary storage
- **Advanced PDF Analysis**: Header/footer detection and table extraction
- **Interactive Preview**: Modal-based transaction review with editing capabilities
- **Duplicate Detection**: Intelligent identification of duplicate transactions and statements
- **User Confirmation**: Multi-step validation before database commitment
- **Enhanced Architecture**: Extensible parser framework with comprehensive error handling

---

## 2. Scope & Objectives

### 2.1 Primary Objectives
- **Secure Processing**: Implement robust file validation and secure temporary storage
- **Intelligent Parsing**: Analyze PDF structure to extract clean transaction data
- **User Control**: Provide comprehensive preview and editing capabilities
- **Data Integrity**: Prevent duplicates and ensure transaction accuracy
- **Seamless Integration**: Integrate with existing transaction management workflow

### 2.2 Supported Input
- **File Types**: Bank-generated PDF statements (text-based, not scanned)
- **Initial Bank Target**: BCA Credit Card (Indonesia)
- **File Size Limit**: 10MB maximum
- **Security**: Virus scanning and content validation

### 2.3 Future Extensibility
- **Multi-Bank Support**: Extensible architecture for additional banks
- **OCR Capability**: Future support for scanned documents
- **Multi-Language**: Support for English and Indonesian statements
- **Advanced Analytics**: Statement-level insights and trends

---

## 3. Enhanced User Flow

### 3.1 File Upload & Validation
1. **Secure Upload Interface**
   - Drag-and-drop file zone with visual feedback
   - File type and size validation (PDF only, max 10MB)
   - Virus scanning and content validation
   - Progress indicator during upload

2. **Account Selection**
   - Dropdown to select target account for transactions
   - Account validation and permission checks
   - Default account selection based on user preferences

### 3.2 PDF Processing Pipeline
1. **Temporary Storage**
   - Secure upload to Supabase Storage (`temp-statements/USER_ID/`)
   - Temporary file with expiration (24 hours)
   - Checksum generation for duplicate detection

2. **PDF Structure Analysis**
   - Text extraction using `pdf-parse` library
   - Header/footer detection across pages
   - Table structure identification
   - Content cleaning and normalization

3. **Bank Detection & Parsing**
   - Automatic bank identification using signature patterns
   - Bank-specific parser selection from registry
   - Transaction extraction with regex patterns
   - Metadata extraction (statement period, account info)

### 3.3 Transaction Preview & Editing
1. **Preview Modal Display**
   - Modal dialog with comprehensive transaction preview
   - Summary cards showing total transactions, amounts, and duplicates
   - Warning indicators for parsing issues or duplicates

2. **Interactive Transaction Table**
   - Editable fields: description, merchant, amount, category
   - Checkbox selection to skip unwanted transactions
   - Duplicate detection with visual indicators
   - Real-time validation and error feedback

3. **Duplicate Management**
   - Toggle to show/hide duplicate transactions
   - Clear duplicate indicators with original transaction references
   - Option to skip or modify duplicate transactions
   - Intelligent duplicate detection based on date, amount, and description

### 3.4 Confirmation & Persistence
1. **Final Review**
   - Summary of selected transactions for import
   - Final validation of all transaction data
   - Account and category assignment confirmation

2. **Database Commitment**
   - Atomic transaction for statement and transaction insertion
   - Statement metadata saved to `statements` table
   - Filtered transactions saved to `transactions` table
   - File moved from temporary to permanent storage
   - Rollback capability if any step fails

---

## 4. Technical Architecture

### 4.1 Database Schema

#### Enhanced Statements Table
```sql
CREATE TABLE statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID REFERENCES accounts(id),
  bank_code VARCHAR(10) NOT NULL,
  statement_period VARCHAR(20),
  file_path TEXT NOT NULL,
  file_checksum VARCHAR(64) NOT NULL UNIQUE,
  total_transactions INTEGER DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'IDR',
  raw_data JSONB,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'processed',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Enhanced Transactions Table
```sql
-- Additional columns for PDF parsing
ALTER TABLE transactions ADD COLUMN statement_id UUID REFERENCES statements(id);
ALTER TABLE transactions ADD COLUMN raw_data JSONB;
ALTER TABLE transactions ADD COLUMN posting_date DATE;
ALTER TABLE transactions ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN duplicate_of UUID REFERENCES transactions(id);
```

### 4.2 Parser Architecture

#### Core Interfaces
```typescript
interface BankParser {
  detect(text: string): boolean;
  parse(text: string): ParseResult;
  cleanText(text: string): string;
  extractMetadata(text: string): StatementMetadata;
}

interface ParseResult {
  transactions: ParsedTransaction[];
  metadata: StatementMetadata;
  warnings: string[];
  confidence: number;
}

interface ParsedTransaction {
  date: string;
  postingDate?: string;
  description: string;
  merchant?: string;
  amount: number;
  currency: string;
  rawData: string;
}
```

#### BCA Parser Implementation
```typescript
export class BCAParser implements BankParser {
  detect(text: string): boolean {
    return /REKENING KARTU KREDIT/i.test(text) && 
           /TANGGAL REKENING/i.test(text);
  }

  parse(text: string): ParseResult {
    const cleanedText = this.cleanText(text);
    const transactions = this.extractTransactions(cleanedText);
    const metadata = this.extractMetadata(text);
    
    return {
      transactions,
      metadata,
      warnings: this.validateTransactions(transactions),
      confidence: this.calculateConfidence(transactions)
    };
  }

  private extractTransactions(text: string): ParsedTransaction[] {
    // Enhanced regex patterns for BCA transaction parsing
    const transactionPattern = /(\d{2}-[A-Z]{3})\s+(\d{2}-[A-Z]{3})\s+(.+?)\s+([\d,]+\.?\d*)\s*(CR)?$/gm;
    // Implementation details...
  }
}
```

### 4.3 API Endpoints

#### Upload & Preview Endpoint
```typescript
// POST /api/statements/upload
interface UploadRequest {
  file: File;
  accountId: string;
}

interface UploadResponse {
  success: boolean;
  preview: {
    statement: StatementMetadata;
    transactions: ParsedTransaction[];
    duplicates: DuplicateInfo[];
    warnings: string[];
  };
  tempFileId: string;
}
```

#### Confirmation Endpoint
```typescript
// POST /api/statements/confirm
interface ConfirmRequest {
  tempFileId: string;
  accountId: string;
  transactions: ParsedTransaction[];
  skipDuplicates: boolean;
}

interface ConfirmResponse {
  success: boolean;
  statementId: string;
  transactionIds: string[];
  summary: {
    imported: number;
    skipped: number;
    duplicates: number;
  };
}
```

### 4.4 Frontend Components

#### PDFStatementUpload Component
```typescript
interface PDFStatementUploadProps {
  onSuccess?: () => void;
  defaultAccountId?: string;
}

// Features:
// - Drag-and-drop file upload
// - Account selection dropdown
// - Upload progress indicator
// - Preview modal integration
// - Error handling and validation
```

#### TransactionPreviewTable Component
```typescript
interface TransactionPreviewTableProps {
  transactions: ParsedTransaction[];
  duplicates: DuplicateInfo[];
  onTransactionChange: (index: number, transaction: ParsedTransaction) => void;
  onSelectionChange: (selectedIndices: number[]) => void;
}

// Features:
// - Editable transaction fields
// - Duplicate detection indicators
// - Category assignment
// - Skip/include toggles
// - Real-time validation
```

---

## 5. Functional Requirements

### 5.1 File Upload & Validation
- **File Type Validation**: Accept only PDF files
- **Size Limits**: Maximum 10MB file size
- **Security Scanning**: Virus and malware detection
- **Content Validation**: Ensure PDF contains extractable text
- **Progress Feedback**: Real-time upload progress indication

### 5.2 PDF Processing
- **Text Extraction**: Extract text content from all pages
- **Header/Footer Removal**: Detect and remove repeated headers/footers
- **Table Detection**: Identify transaction table structures
- **Bank Detection**: Automatic bank identification with 95%+ accuracy
- **Error Handling**: Graceful handling of corrupted or unsupported PDFs

### 5.3 Transaction Parsing
- **BCA Pattern Matching**: Parse BCA credit card statement format
- **Date Parsing**: Extract transaction and posting dates
- **Amount Normalization**: Handle various number formats and currencies
- **Description Cleaning**: Remove unnecessary formatting and characters
- **Merchant Extraction**: Identify merchant names from descriptions

### 5.4 Duplicate Detection
- **Statement-Level**: Prevent duplicate statement uploads using checksums
- **Transaction-Level**: Identify duplicate transactions across statements
- **Intelligent Matching**: Match based on date, amount, and description similarity
- **User Override**: Allow users to import duplicates if needed

### 5.5 User Interface
- **Preview Modal**: Comprehensive transaction preview before import
- **Editable Fields**: Allow users to modify transaction details
- **Category Assignment**: Automatic and manual category assignment
- **Validation Feedback**: Real-time validation with error messages
- **Confirmation Flow**: Multi-step confirmation before database commitment

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **Processing Speed**: Parse 10-page statement in ≤3 seconds
- **File Upload**: Support concurrent uploads with progress tracking
- **Memory Efficiency**: Process large files without memory issues
- **Database Performance**: Optimized queries with proper indexing

### 6.2 Security
- **File Validation**: Comprehensive security scanning
- **Temporary Storage**: Secure temporary file handling with expiration
- **Access Control**: Row-level security for all database operations
- **Data Encryption**: Encrypted file storage and transmission

### 6.3 Reliability
- **Error Recovery**: Graceful handling of parsing failures
- **Transaction Safety**: Atomic operations with rollback capability
- **Data Integrity**: Comprehensive validation at all stages
- **Monitoring**: Detailed logging and error tracking

### 6.4 Extensibility
- **Parser Framework**: Easy addition of new bank parsers
- **Configuration**: Configurable parsing rules and patterns
- **API Versioning**: Backward-compatible API evolution
- **Plugin Architecture**: Support for custom parsing extensions

---

## 7. User Experience Requirements

### 7.1 Upload Experience
- **Intuitive Interface**: Clear drag-and-drop zone with visual feedback
- **Progress Indication**: Real-time upload and processing progress
- **Error Communication**: Clear error messages with resolution guidance
- **Mobile Responsive**: Optimized for mobile device usage

### 7.2 Preview Experience
- **Comprehensive Overview**: Summary cards with key statistics
- **Interactive Table**: Sortable, filterable transaction preview
- **Visual Indicators**: Clear duplicate and error indicators
- **Editing Capabilities**: Inline editing with validation feedback

### 7.3 Confirmation Experience
- **Final Review**: Clear summary of import actions
- **Validation Feedback**: Comprehensive validation before commitment
- **Success Communication**: Clear confirmation of successful import
- **Error Recovery**: Options to retry or modify on failure

---

## 8. Integration Requirements

### 8.1 Existing Components
- **AddTransactionForm**: Integrate PDF upload as additional tab
- **TransactionTable**: Reuse existing transaction display components
- **CategoryManager**: Leverage existing category assignment logic
- **AccountManager**: Integrate with existing account management

### 8.2 Database Integration
- **Transaction Context**: Update existing transaction management hooks
- **Real-time Updates**: Trigger UI updates after successful import
- **Data Consistency**: Maintain consistency with existing transaction data
- **Migration Support**: Smooth migration of existing data structures

### 8.3 API Integration
- **Consistent Patterns**: Follow existing API design patterns
- **Error Handling**: Consistent error response formats
- **Authentication**: Integrate with existing auth mechanisms
- **Validation**: Reuse existing validation schemas

---

## 9. Testing Requirements

### 9.1 Unit Testing
- **Parser Logic**: Comprehensive testing of parsing algorithms
- **Validation Rules**: Test all validation scenarios
- **Error Handling**: Test error conditions and edge cases
- **Component Logic**: Test React component behavior

### 9.2 Integration Testing
- **API Endpoints**: Test complete upload and confirmation flows
- **Database Operations**: Test transaction atomicity and rollback
- **File Processing**: Test with various PDF formats and sizes
- **Security**: Test file validation and security measures

### 9.3 User Acceptance Testing
- **End-to-End Flows**: Test complete user workflows
- **Error Scenarios**: Test user experience during errors
- **Performance**: Test with large files and datasets
- **Cross-Browser**: Test across different browsers and devices

---

## 10. Acceptance Criteria

### 10.1 Core Functionality
- ✅ Upload BCA PDF → system detects BCA bank automatically
- ✅ Strip headers/footers → clean transaction data extraction
- ✅ Parse ≥95% of transaction rows correctly
- ✅ Include date, posting date, description, and signed amount
- ✅ Parse "CR" lines as positive, others as negative amounts

### 10.2 Enhanced Features
- ✅ Secure file upload with validation and progress tracking
- ✅ Interactive preview modal with editable transaction fields
- ✅ Duplicate detection at statement and transaction levels
- ✅ User confirmation flow before database commitment
- ✅ Integration with existing transaction management system

### 10.3 Data Persistence
- ✅ File saved to Supabase Storage with proper organization
- ✅ Statement metadata saved to `statements` table
- ✅ Transactions saved to `transactions` table with relationships
- ✅ Atomic operations with rollback on failure
- ✅ Proper indexing and RLS policies applied

### 10.4 User Experience
- ✅ Intuitive drag-and-drop upload interface
- ✅ Real-time progress and status feedback
- ✅ Clear error messages and resolution guidance
- ✅ Mobile-responsive design across all components
- ✅ Seamless integration with existing UI patterns

---

## 11. Future Enhancements

### 11.1 Planned Features (Phase 2)
- **OCR Support**: Process scanned PDF documents
- **Multi-Bank Support**: Add parsers for HSBC, BNI, Mandiri
- **Advanced Analytics**: Statement-level insights and trends
- **Bulk Processing**: Upload and process multiple statements
- **Smart Categorization**: AI-powered automatic categorization

### 11.2 Advanced Features (Phase 3)
- **Real-time Processing**: WebSocket-based progress updates
- **Cloud OCR**: Integration with cloud OCR services
- **Machine Learning**: Improve parsing accuracy with ML models
- **API Integrations**: Direct bank API connections
- **Advanced Validation**: Cross-reference with bank APIs

### 11.3 Enterprise Features (Phase 4)
- **Multi-tenant Support**: Support for business accounts
- **Audit Trails**: Comprehensive audit logging
- **Compliance**: Support for financial regulations
- **Advanced Security**: Enhanced security measures
- **Performance Optimization**: Advanced caching and optimization

---

## 12. Success Metrics

### 12.1 Technical Metrics
- **Parsing Accuracy**: ≥95% transaction parsing accuracy
- **Processing Speed**: ≤3 seconds for 10-page statements
- **Error Rate**: <2% processing failures
- **Duplicate Detection**: ≥98% duplicate identification accuracy

### 12.2 User Experience Metrics
- **Upload Success Rate**: ≥98% successful uploads
- **User Satisfaction**: ≥4.5/5 user rating
- **Task Completion**: ≥95% successful end-to-end flows
- **Error Recovery**: ≥90% successful error recovery

### 12.3 Business Metrics
- **Adoption Rate**: ≥60% of users try PDF upload feature
- **Usage Frequency**: ≥40% of users use feature monthly
- **Data Quality**: ≥95% of imported transactions require no manual correction
- **Support Tickets**: <5% of uploads generate support requests

---

## 13. Risk Assessment & Mitigation

### 13.1 Technical Risks
- **PDF Format Changes**: Bank changes statement format
  - *Mitigation*: Versioned parsers with fallback mechanisms
- **Performance Issues**: Large file processing
  - *Mitigation*: Streaming processing and file size limits
- **Security Vulnerabilities**: Malicious file uploads
  - *Mitigation*: Comprehensive validation and sandboxing

### 13.2 User Experience Risks
- **Complex Interface**: Users find preview interface confusing
  - *Mitigation*: User testing and iterative design improvements
- **Data Loss**: Users accidentally skip important transactions
  - *Mitigation*: Clear warnings and confirmation steps
- **Error Handling**: Poor error communication
  - *Mitigation*: Comprehensive error messages and help documentation

### 13.3 Business Risks
- **Low Adoption**: Users prefer manual entry
  - *Mitigation*: Clear value proposition and user education
- **Support Burden**: High support ticket volume
  - *Mitigation*: Comprehensive documentation and self-help features
- **Compliance Issues**: Regulatory compliance concerns
  - *Mitigation*: Legal review and compliance documentation

---

## 14. Implementation Timeline

### 14.1 Phase 1: Core Implementation (Completed)
- ✅ Database schema design and migration
- ✅ Basic parser architecture and BCA implementation
- ✅ File upload and processing pipeline
- ✅ Preview modal and transaction editing
- ✅ Confirmation flow and database persistence

### 14.2 Phase 2: Enhancement & Testing (2 weeks)
- 🔄 Comprehensive testing and bug fixes
- 🔄 Performance optimization and monitoring
- 🔄 Documentation and user guides
- 🔄 Security audit and validation

### 14.3 Phase 3: Production Deployment (1 week)
- ⏳ Production environment setup
- ⏳ User acceptance testing
- ⏳ Gradual rollout and monitoring
- ⏳ Post-deployment support and optimization

---

## 15. Conclusion

The enhanced BCA PDF Parser represents a significant advancement in the MoneyFlow app's data ingestion capabilities. By implementing secure file upload, intelligent PDF processing, interactive user preview, and comprehensive duplicate detection, we provide users with a powerful yet user-friendly tool for importing bank statement data.

The extensible architecture ensures future scalability while maintaining high standards for security, performance, and user experience. The comprehensive testing and validation framework ensures reliable operation and high data quality.

This implementation serves as a foundation for future enhancements including multi-bank support, OCR capabilities, and advanced analytics, positioning MoneyFlow as a leader in automated financial data processing.