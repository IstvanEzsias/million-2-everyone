import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Flame, Trophy, Zap } from 'lucide-react';

interface DifficultyLevel {
  name: string;
  display_name_en: string;
  display_name_sl: string;
  display_name_hu: string;
  description_en: string;
  description_sl: string;
  description_hu: string;
  reward_amount: number;
  reward_type: string;
  sort_order: number;
}

interface DifficultyCardsProps {
  currentDifficulty: string;
  onSelect: (difficulty: string) => void;
}

export const DifficultyCards = ({ currentDifficulty, onSelect }: DifficultyCardsProps) => {
  const { t, i18n } = useTranslation('game');
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDifficulties = async () => {
      const { data, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .order('sort_order', { ascending: true });

      if (data && !error) {
        setDifficulties(data);
      }
      setLoading(false);
    };

    loadDifficulties();
  }, []);

  const getDifficultyIcon = (name: string) => {
    switch (name) {
      case 'easy':
        return <CheckCircle2 className="w-8 h-8 text-green-500" />;
      case 'intermediate':
        return <Zap className="w-8 h-8 text-yellow-500" />;
      case 'impossible':
        return <Flame className="w-8 h-8 text-red-500" />;
      default:
        return null;
    }
  };

  const getDifficultyColor = (name: string) => {
    const isActive = name === currentDifficulty;
    
    switch (name) {
      case 'easy':
        return isActive 
          ? 'border-green-500 shadow-lg shadow-green-500/20 ring-2 ring-green-500/50 scale-105' 
          : 'border-green-500/50 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20';
      case 'intermediate':
        return isActive 
          ? 'border-yellow-500 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-500/50 scale-105' 
          : 'border-yellow-500/50 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20';
      case 'impossible':
        return isActive 
          ? 'border-red-500 shadow-lg shadow-red-500/20 ring-2 ring-red-500/50 scale-105' 
          : 'border-red-500/50 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Loading difficulty levels...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">
          {t('difficulty.title')}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t('difficulty.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {difficulties.map((difficulty) => {
          const displayName = i18n.language === 'hu'
            ? difficulty.display_name_hu
            : i18n.language === 'sl' 
            ? difficulty.display_name_sl 
            : difficulty.display_name_en;
          const description = i18n.language === 'hu'
            ? difficulty.description_hu
            : i18n.language === 'sl'
            ? difficulty.description_sl
            : difficulty.description_en;
          const isActive = difficulty.name === currentDifficulty;
          
          return (
            <Card
              key={difficulty.name}
              className={`relative p-6 border-2 transition-all duration-300 cursor-pointer ${getDifficultyColor(difficulty.name)}`}
              onClick={() => onSelect(difficulty.name)}
            >
              {/* Active indicator badge */}
              {isActive && (
                <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-4">
                {getDifficultyIcon(difficulty.name)}
                
                <h3 className="text-2xl font-bold">{displayName}</h3>
                
                <p className="text-sm text-muted-foreground min-h-[60px]">
                  {description}
                </p>

                <div className="pt-4 border-t border-border w-full">
                  {difficulty.reward_type === 'lana8wonder' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-lg font-bold text-red-500">
                        <Trophy className="w-5 h-5" />
                        {t('difficulty.rewards.lana8wonder')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('difficulty.rewards.eliteFew')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-lg font-bold">
                      🪙 {difficulty.reward_amount} {t('difficulty.rewards.registeredLana')}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  variant={isActive ? 'default' : difficulty.name === 'impossible' ? 'destructive' : 'outline'}
                >
                  {isActive 
                    ? t('difficulty.current')
                    : t('difficulty.select')
                  }
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
