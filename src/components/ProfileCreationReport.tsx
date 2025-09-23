import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Wifi, Database, Mail, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RelayResult {
  url: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

interface ProfileCreationResult {
  success: boolean;
  eventId?: string;
  playerId?: string;
  relayResults?: {
    total: number;
    successful: number;
    failed: number;
    details: RelayResult[];
  };
  message?: string;
  error?: string;
}

interface ProfileCreationReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ProfileCreationResult | null;
}

export const ProfileCreationReport = ({ open, onOpenChange, result }: ProfileCreationReportProps) => {
  const navigate = useNavigate();

  const handleClose = () => {
    onOpenChange(false);
    navigate('/');
  };

  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            NOSTR Profile Creation Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Status */}
          <div className="p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">Overall Status</h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "Success" : "Failed"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {result.message || result.error}
              </span>
            </div>
          </div>

          {result.success && (
            <>
              {/* NOSTR Event Details */}
              <div className="p-4 rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  NOSTR Event
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Event ID:</span>
                    <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                      {result.eventId}
                    </code>
                  </div>
                </div>
              </div>

              {/* Database Storage */}
              <div className="p-4 rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database Storage
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Player record created successfully</span>
                  </div>
                  <div>
                    <span className="font-medium">Player ID:</span>
                    <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                      {result.playerId}
                    </code>
                  </div>
                </div>
              </div>

              {/* Relay Broadcasting Results */}
              {result.relayResults && (
                <div className="p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Relay Broadcasting
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.relayResults.total}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Relays</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {result.relayResults.successful}
                      </div>
                      <div className="text-xs text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {result.relayResults.failed}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detailed Results:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.relayResults.details.map((relay, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded border text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {relay.success ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <code className="text-xs">{relay.url}</code>
                          </div>
                          <div className="flex items-center gap-2">
                            {relay.responseTime && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {relay.responseTime}ms
                              </span>
                            )}
                            {relay.error && (
                              <span className="text-xs text-red-500" title={relay.error}>
                                Error
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
                <h3 className="font-semibold mb-2">Next Steps</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <span>Wallet registration API (Coming soon)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email notification system (Coming soon)</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {!result.success && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950">
              <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200">Error Details</h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {result.error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Back to Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};