
'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { getFriendlyErrorMessage, AuthError } from '@/lib/auth-errors'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface AuthErrorMessageProps {
  error: any;
  className?: string;
  onRetry?: () => void;
}

export function AuthErrorMessage({ error, className, onRetry }: AuthErrorMessageProps) {
  if (!error) return null;

  const authError: AuthError = getFriendlyErrorMessage(error);
  
  const getIcon = () => {
    switch (authError.severity) {
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (authError.severity) {
      case 'error': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <Alert variant={getVariant()} className={className}>
      {getIcon()}
      <AlertTitle className="capitalize">{authError.severity}</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-2">
        <p>{authError.friendlyMessage}</p>
        
        {authError.action && (
          <div className="mt-1">
            {authError.action.href ? (
              <Link href={authError.action.href} className="font-medium underline underline-offset-4 hover:opacity-80">
                {authError.action.label}
              </Link>
            ) : authError.action.onClick ? (
              <button 
                onClick={authError.action.onClick}
                className="font-medium underline underline-offset-4 hover:opacity-80"
              >
                {authError.action.label}
              </button>
            ) : null}
          </div>
        )}

        {onRetry && (
           <Button 
             variant="link" 
             className="h-auto p-0 text-inherit underline underline-offset-4 w-fit"
             onClick={onRetry}
           >
             Try again
           </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
