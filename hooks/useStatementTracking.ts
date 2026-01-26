import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics';

export function useStatementTracking() {
  const { trackEvent } = useAnalytics();

  const trackUploadStarted = useCallback((
    fileType: string,
    fileSize: number,
    accountInfo: {
      accountName?: string;
      selectedBank?: string;
      accountType: string;
    }
  ) => {
    trackEvent('statement_upload_started', {
      file_type: fileType,
      file_size: fileSize,
      account_name: accountInfo.accountName,
      selected_bank: accountInfo.selectedBank,
      account_type: accountInfo.accountType,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackProcessingCompleted = useCallback((
    sessionId: string,
    result: {
      bankDetected?: string;
      bankMatchesSelected: boolean;
      confidenceScore: number;
      transactionsExtracted: number;
      duplicatesFound: number;
      processingTime: number;
      fileType: string;
    }
  ) => {
    trackEvent('statement_processing_completed', {
      session_id: sessionId,
      ...result,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackProcessingFailed = useCallback((
    sessionId: string,
    error: {
      errorType: string;
      errorMessage: string;
      fileType: string;
    }
  ) => {
    trackEvent('statement_processing_failed', {
      session_id: sessionId,
      ...error,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackTransactionsImported = useCallback((
    sessionId: string,
    importData: {
      importedCount: number;
      accountId: string;
      accountName: string;
      bankName?: string;
      totalAmount: number;
    }
  ) => {
    trackEvent('transactions_imported', {
      session_id: sessionId,
      ...importData,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  return {
    trackUploadStarted,
    trackProcessingCompleted,
    trackProcessingFailed,
    trackTransactionsImported
  };
}
