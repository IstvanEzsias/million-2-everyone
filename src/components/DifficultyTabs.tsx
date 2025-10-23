import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface DifficultyTabsProps {
  currentDifficulty: string;
  onSelect: (difficulty: string) => void;
}

const DifficultyTabs = ({ currentDifficulty, onSelect }: DifficultyTabsProps) => {
  const { t, i18n } = useTranslation('game');
  const currentLanguage = i18n.language;

  const { data: difficulties, isLoading } = useQuery({
    queryKey: ['difficulty-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-12 w-32" />
      </div>
    );
  }

  const getDifficultyIcon = (name: string) => {
    switch (name) {
      case 'easy':
        return '🟢';
      case 'intermediate':
        return '🟡';
      case 'impossible':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getDifficultyVariant = (name: string) => {
    if (name === currentDifficulty) {
      return 'default';
    }
    return 'outline';
  };

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {difficulties?.map((difficulty) => {
        const displayName = currentLanguage === 'sl' 
          ? difficulty.display_name_sl 
          : difficulty.display_name_en;
        const isCurrent = difficulty.name === currentDifficulty;
        
        return (
          <Button
            key={difficulty.id}
            variant={getDifficultyVariant(difficulty.name)}
            onClick={() => onSelect(difficulty.name)}
            className="min-w-[120px] sm:min-w-[140px] relative"
            size="lg"
          >
            <span className="mr-2">{getDifficultyIcon(difficulty.name)}</span>
            <span>{displayName}</span>
            {isCurrent && (
              <span className="ml-2 text-xs opacity-75">
                {t('levelSwitch.current')}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default DifficultyTabs;
