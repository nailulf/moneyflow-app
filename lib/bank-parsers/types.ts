/**
 * Bank Parser Types
 * Common interfaces and types for bank statement parsing
 */

export interface ParsedTransaction {
  date: string;
  postingDate?: string;
  description: string;
  merchant?: string;
  amount: number;
  currency: string;
  rawData: string;
  category?: string;
  category_id?: string;
  isAiSuggested?: boolean;
  isDuplicate?: boolean;
  duplicateReason?: string;
  notes?: string;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}

export interface StatementMetadata {
  bankName: string;
  accountNumber?: string;
  statementPeriodStart?: string;
  statementPeriodEnd?: string;
  pages: number;
  confidence: number;
  detectedBank?: string;
}

export interface BankDetectionResult {
  detectedBank: string;
  confidence: number;
  method: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  metadata: StatementMetadata;
  warnings: string[];
  confidence: number;
}

export interface BankParser {
  detect(text: string): boolean;
  parse(text: string): ParseResult;
  cleanText(text: string): string;
  extractMetadata(text: string): StatementMetadata;
}

export interface DuplicateInfo {
  transactionIndex: number;
  duplicateOf: number;
  reason: string;
  confidence: number;
}

export interface UploadPreview {
  transactions: ParsedTransaction[];
  metadata: StatementMetadata;
  duplicates: DuplicateInfo[];
  warnings: string[];
  summary: {
    totalTransactions: number;
    totalAmount: number;
    duplicateCount: number;
    currency: string;
  };
}