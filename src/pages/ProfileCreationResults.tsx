import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Wifi, Database, Mail, Wallet, ArrowLeft, RotateCcw } from 'lucide-react';
import { clearWalletSessionData, getReturnUrlData, clearReturnUrlData } from '@/utils/sessionStorage';
import { useTranslation } from 'react-i18next';

interface RelayResult {
  url: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

interface WalletRegistrationResult {
  success: boolean;
  wallet_id: string;
  status: string;
  message: string;
  data?: any;
  error?: string;
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
  walletRegistration?: WalletRegistrationResult;
  message?: string;
  error?: string;
}

const ProfileCreationResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<ProfileCreationResult | null>(null);
  const [returnUrlData, setReturnUrlData] = useState<{url: string, siteName?: string} | null>(null);
  const { t } = useTranslation('results');

  useEffect(() => {
    // Get the result from navigation state
    const state = location.state as { result?: ProfileCreationResult };
    if (state?.result) {
      setResult(state.result);
    } else {
      // If no result data, redirect back to home
      navigate('/');
    }

    // Check for return URL data
    const returnData = getReturnUrlData();
    if (returnData) {
      setReturnUrlData({ url: returnData.url, siteName: returnData.siteName });
    }
  }, [location.state, navigate]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleCreateAnother = () => {
    // Clear session data and go back to create profile
    clearWalletSessionData();
    navigate('/');
  };

  const handleReturnToSite = () => {
    if (returnUrlData) {
      clearReturnUrlData();
      window.location.href = returnUrlData.url;
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              {t('title')}
            </CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Overall Status */}
            <div className="p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">{t('overallStatus')}</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? t('success') : t('failed')}
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
                    {t('nostrEvent')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{t('eventId')}</span>
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
                    {t('databaseStorage')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t('playerRecordCreated')}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t('playerId')}</span>
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
                      {t('relayBroadcasting')}
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {result.relayResults.total}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('totalRelays')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {result.relayResults.successful}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('successful')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {result.relayResults.failed}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('failed')}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{t('detailedResults')}</h4>
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
                                  {t('error')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Wallet Registration */}
                {result.walletRegistration && (
                  <div className="p-4 rounded-lg border">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {t('walletRegistration')}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {result.walletRegistration.success && result.walletRegistration.status === 'ok' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">
                              {t('walletRegisteredSuccess')}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">
                              {result.walletRegistration.message || t('registrationFailed')}
                            </span>
                          </>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{t('walletId')}</span>
                        <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                          {result.walletRegistration.wallet_id}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">{t('status')}</span>
                        <Badge variant={result.walletRegistration.status === 'ok' ? 'default' : 'destructive'} className="ml-2">
                          {result.walletRegistration.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
                  <h3 className="font-semibold mb-2">{t('nextSteps')}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{t('emailNotification')}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!result.success && (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950">
                <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200">{t('errorDetails')}</h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {result.error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              {returnUrlData ? (
                <>
                  <Button onClick={handleReturnToSite} className="bg-primary hover:bg-primary/90 flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {t('buttons.returnToSite', { siteName: returnUrlData.siteName || 'Referring Site' })}
                  </Button>
                  <Button onClick={handleBackToHome} variant="outline" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {t('buttons.stayAndExplore')}
                  </Button>
                  <Button onClick={handleCreateAnother} variant="outline" className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    {t('buttons.createAnotherProfile')}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleBackToHome} variant="outline" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {t('buttons.backToHome')}
                  </Button>
                  <Button onClick={handleCreateAnother} className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    {t('buttons.createAnotherProfile')}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileCreationResults;