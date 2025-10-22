import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Flame, Trophy, Zap } from 'lucide-react';

interface DifficultyLevel {
  name: string;
  display_name_en: string;
  display_name_sl: string;
  description_en: string;
  description_sl: string;
  reward_amount: number;
  reward_type: string;
  sort_order: number;
}

interface DifficultySelectorProps {
  open: boolean;
  onSelect: (difficulty: string) => void;
}

export const DifficultySelector = ({ open, onSelect }: DifficultySelectorProps) => {
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
    switch (name) {
      case 'easy':
        return 'border-green-500/50 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20';
      case 'intermediate':
        return 'border-yellow-500/50 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20';
      case 'impossible':
        return 'border-red-500/50 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Dialog open={open}>
        <DialogContent className="max-w-4xl">
          <div className="text-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center mb-2">
            {t('difficulty.title', 'Choose Your Challenge')}
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Complete 37 successful jumps to earn your reward!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {difficulties.map((difficulty) => {
            const displayName = i18n.language === 'sl' ? difficulty.display_name_sl : difficulty.display_name_en;
            const description = i18n.language === 'sl' ? difficulty.description_sl : difficulty.description_en;
            
            return (
              <Card
                key={difficulty.name}
                className={`p-6 border-2 transition-all duration-300 cursor-pointer ${getDifficultyColor(difficulty.name)}`}
                onClick={() => onSelect(difficulty.name)}
              >
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
                          Lana8Wonder Registration
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Join the elite few!
                        </p>
                      </div>
                    ) : (
                      <div className="text-lg font-bold">
                        🪙 {difficulty.reward_amount} Registered Lana
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    variant={difficulty.name === 'impossible' ? 'destructive' : 'default'}
                  >
                    {t('difficulty.select', 'Play This Level')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
