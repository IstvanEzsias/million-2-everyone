import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface PrizeData {
  success: boolean;
  availablePrizes: number;
  error?: string;
  timestamp: string;
}

const PrizeAvailabilityBadge = () => {
  const { t } = useTranslation('common');
  const [prizeData, setPrizeData] = useState<PrizeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrizeData = async () => {
    try {
      setError(null);
      console.log('🎯 Fetching available prizes...');
      
      const { data, error: functionError } = await supabase.functions.invoke('get-available-prizes');
      
      if (functionError) {
        throw new Error(functionError.message);
      }
      
      console.log('🎁 Prize data received:', data);
      setPrizeData(data);
    } catch (err) {
      console.error('❌ Error fetching prize data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prize data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPrizeData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchPrizeData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-center mb-6">
        <Badge variant="secondary" className="text-sm animate-pulse">
          {t('labels.loading')}
        </Badge>
      </div>
    );
  }

  if (error || !prizeData?.success) {
    return (
      <div className="text-center mb-6">
        <Badge variant="destructive" className="text-sm cursor-pointer" onClick={fetchPrizeData}>
          {t('prize.error')} - {t('buttons.retry')}
        </Badge>
      </div>
    );
  }

  return (
    <div className="text-center mb-6">
      <Badge variant="default" className="text-lg px-4 py-2 font-bold bg-gradient-primary text-white shadow-glow">
        🎁 {t('prize.availableSlots')}: {prizeData.availablePrizes.toLocaleString()}
      </Badge>
      <p className="text-xs text-muted-foreground mt-1">
        {t('prize.realTimeBalance')}
      </p>
    </div>
  );
};

export default PrizeAvailabilityBadge;