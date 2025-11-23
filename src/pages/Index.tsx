import GameHeader from "@/components/GameHeader";
import GameCanvas from "@/components/GameCanvas";
import GameStats from "@/components/GameStats";
import GameEndDialog from "@/components/GameEndDialog";
import { DifficultyCards } from "@/components/DifficultyCards";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PrizeAvailabilityBadge from "@/components/PrizeAvailabilityBadge";
import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { setReturnUrlData, getReturnUrlData } from "@/utils/sessionStorage";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GameState {
  price: number;
  users: number;
  jumps: number;
  gameRunning: boolean;
}

const Index = () => {
  const { t } = useTranslation('game');
  const [gameState, setGameState] = useState<GameState>({
    price: 0.001,
    users: 100,
    jumps: 0,
    gameRunning: true
  });
  const [returnUrlInfo, setReturnUrlInfo] = useState<{url: string, siteName?: string} | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('intermediate');
  const [showLevelChangeConfirm, setShowLevelChangeConfirm] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<string | null>(null);

  useEffect(() => {
    // Check for return_url parameter
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('return_url');
    const siteName = urlParams.get('site_name');
    
    if (returnUrl) {
      const success = setReturnUrlData(returnUrl, siteName || undefined);
      if (success) {
        setReturnUrlInfo({ url: returnUrl, siteName: siteName || undefined });
        // Clean URL by removing the parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else {
      // Check if we already have return URL data
      const existingData = getReturnUrlData();
      if (existingData) {
        setReturnUrlInfo({ url: existingData.url, siteName: existingData.siteName });
      }
    }
  }, []);

  const handleDifficultyChange = (newDifficulty: string) => {
    if (newDifficulty === selectedDifficulty) return;
    
    if (gameState.jumps > 0) {
      setPendingDifficulty(newDifficulty);
      setShowLevelChangeConfirm(true);
    } else {
      switchDifficulty(newDifficulty);
    }
  };

  const switchDifficulty = (newDifficulty: string) => {
    setSelectedDifficulty(newDifficulty);
    setGameState({
      price: 0.001,
      users: 100,
      jumps: 0,
      gameRunning: true
    });
  };

  const confirmLevelChange = () => {
    if (pendingDifficulty) {
      switchDifficulty(pendingDifficulty);
    }
    setShowLevelChangeConfirm(false);
    setPendingDifficulty(null);
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        
        <main>
          {/* Return URL info */}
          {returnUrlInfo && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm">
                <span>🔗</span>
                <span>
                  {t('returnNotice', { siteName: returnUrlInfo.siteName || 'the referring site' })}
                </span>
              </div>
            </div>
          )}

          {/* Header with logo and title */}
          <GameHeader />
          
          {/* Game stats display */}
          <GameStats gameState={gameState} />
          
          {/* Difficulty Selection Cards - Always visible */}
          <div className="mb-8">
            <DifficultyCards 
              currentDifficulty={selectedDifficulty}
              onSelect={handleDifficultyChange}
            />
          </div>
          
          {/* Game canvas */}
          <div className="flex justify-center">
            <GameCanvas 
              key={selectedDifficulty}
              onStateChange={setGameState}
              difficulty={selectedDifficulty}
            />
          </div>
          
          {/* Footer info */}
          <footer className="mt-12 text-center text-muted-foreground">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-primary mb-2">{t('footer.whatsNext')}</h3>
              <p className="mb-4">
                {t('footer.description')}
              </p>
              <div className="text-sm opacity-75 mb-4">
                {t('footer.ownership')}
              </div>
              <div className="text-xs">
                <a 
                  href="/referral-docs" 
                  className="text-primary hover:text-primary/80 underline"
                >
                  {t('footer.referralDocs')}
                </a>
              </div>
            </div>
          </footer>
        </main>
        
        {/* Skip Game Dialog */}
        <GameEndDialog 
          open={showSkipDialog} 
          onOpenChange={setShowSkipDialog}
          playedGame={false}
        />
        
        {/* Level Change Confirmation Dialog */}
        <AlertDialog open={showLevelChangeConfirm} onOpenChange={setShowLevelChangeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('levelSwitch.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('levelSwitch.description', { jumps: gameState.jumps })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDifficulty(null)}>
                {t('levelSwitch.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmLevelChange}>
                {t('levelSwitch.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Index;
