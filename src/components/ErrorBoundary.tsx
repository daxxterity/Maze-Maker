import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let isQuotaError = false;
      
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          errorMessage = parsed.error;
          const lowerError = errorMessage.toLowerCase();
          
          if (lowerError.includes('quota exceeded') || lowerError.includes('quota')) {
            isQuotaError = true;
          }
          
          if (lowerError.includes('offline')) {
            errorMessage = "Firestore is reporting as 'Offline'. This usually means your Project ID is incorrect, or the Firestore Database has not been created yet in the Firebase Console.";
          } else {
            errorMessage = `Firestore Error: ${errorMessage} (${parsed.operationType} on ${parsed.path})`;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
        if (errorMessage.toLowerCase().includes('quota exceeded') || errorMessage.toLowerCase().includes('quota')) {
          isQuotaError = true;
        }
      }

      return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-6 text-center">
          <div className={cn(
            "max-w-md w-full bg-zinc-900 border rounded-3xl p-8 shadow-2xl",
            isQuotaError ? "border-amber-500/50" : "border-red-500/50"
          )}>
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
              isQuotaError ? "bg-amber-500/20" : "bg-red-500/20"
            )}>
              {isQuotaError ? <Zap className="text-amber-500" size={32} /> : <AlertCircle className="text-red-500" size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {isQuotaError ? "Dungeon at Capacity" : "Application Error"}
            </h2>
            <p className="text-zinc-400 mb-8 font-mono text-sm break-words">
              {isQuotaError 
                ? "The daily magic quota for this dungeon has been exhausted. The spirits are resting and will return tomorrow."
                : errorMessage}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "w-full py-4 text-white font-bold rounded-xl transition-all active:scale-95",
                  isQuotaError ? "bg-amber-600 hover:bg-amber-500" : "bg-red-600 hover:bg-red-500"
                )}
              >
                Try Reconnecting
              </button>
              {isQuotaError && (
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Quota resets daily at midnight Pacific Time
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
