import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateWallet, type WalletData } from "@/utils/walletGenerator";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Key, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { setWalletSessionData } from "@/utils/sessionStorage";
import hundredMillionLogo from "@/assets/100-million-logo.png";
import { useTranslation } from 'react-i18next';

interface DifficultySettings {
  name: string;
  reward_amount: number;
  reward_type: string;
  display_name_en: string;
  display_name_sl: string;
}

interface GameEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playedGame?: boolean;
  difficulty?: string;
  difficultySettings?: DifficultySettings | null;
}

const GameEndDialog = ({ 
  open, 
  onOpenChange, 
  playedGame = true,
  difficulty = 'intermediate',
  difficultySettings
}: GameEndDialogProps) => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('profile');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);

  // Check if libraries are loaded with timeout fallback
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50; // 5 second timeout (50 * 100ms)
    
    const checkLibraries = () => {
      console.log('Checking libraries, attempt:', attempts + 1);
      console.log('Libraries status:', {
        elliptic: !!window.elliptic,
        CryptoJS: !!window.CryptoJS
      });
      
      if (window.elliptic && window.CryptoJS) {
        console.log('All libraries loaded successfully!');
        setLibrariesLoaded(true);
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkLibraries, 100);
      } else {
        console.error('Timeout: Libraries failed to load after 5 seconds');
        // Allow proceeding anyway to show a better error message
        setLibrariesLoaded(true);
      }
    };
    
    checkLibraries();
  }, []);

  const handleCreateWallet = async () => {
    setIsGenerating(true);
    try {
      console.log("Starting wallet generation...");
      const wallet = await generateWallet();
      console.log("Wallet generated successfully:", wallet);
      // Normalize the private key to prevent whitespace issues
      const normalizedWallet = {
        ...wallet,
        privateKeyWIF: wallet.privateKeyWIF.trim()
      };
      setWalletData(normalizedWallet);
      toast({
        title: t('notifications.walletCreated'),
        description: t('notifications.walletCreatedDesc'),
      });
    } catch (error) {
      console.error("Wallet generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate wallet. Please try again.";
      toast({
        title: t('notifications.noWalletData'),
        description: errorMessage.includes("libraries not loaded") 
          ? t('notifications.cryptoLibraryError') 
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateWallet = async () => {
    setIsGenerating(true);
    try {
      const wallet = await generateWallet();
      // Normalize the private key to prevent whitespace issues
      const normalizedWallet = {
        ...wallet,
        privateKeyWIF: wallet.privateKeyWIF.trim()
      };
      setWalletData(normalizedWallet);
      toast({
        title: t('notifications.walletRegenerated'),
        description: t('notifications.walletRegeneratedDesc'),
      });
    } catch (error) {
      console.error("Wallet regeneration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to regenerate wallet. Please try again.";
      toast({
        title: t('notifications.noWalletData'),
        description: errorMessage.includes("libraries not loaded") 
          ? t('notifications.cryptoLibraryError') 
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    // Trim text before copying to prevent whitespace issues
    const cleanText = text.trim();
    navigator.clipboard.writeText(cleanText);
    toast({
      title: t('notifications.copied'),
      description: t('notifications.copiedDesc', { label }),
    });
  };

  const handleEmailAndNostr = () => {
    if (!walletData) {
      toast({
        title: t('notifications.noWalletData'),
        description: t('notifications.noWalletDataDesc'),
        variant: "destructive",
      });
      return;
    }

    // Store wallet data in session storage (no email required now)
    setWalletSessionData({
      nostrPrivateKey: walletData.privateKeyHex,
      lanaPrivateKey: walletData.privateKeyWIF,
      walletId: walletData.lanaAddress,
      nostrHex: walletData.nostrHexId,
      email: "", // No email required anymore
      playedGame: playedGame
    });

    // Store difficulty for edge function
    sessionStorage.setItem('game_difficulty', difficulty);

    // Navigate to NOSTR profile page
    navigate("/nostr-profile");
  };

  const getDifficultyDisplayName = () => {
    if (!difficultySettings) return '';
    return i18n.language === 'sl' ? difficultySettings.display_name_sl : difficultySettings.display_name_en;
  };

  const getRewardText = () => {
    return '🪙 1 Registered Lana';
  };

  const getRewardSubtitle = () => {
    if (!difficultySettings) return null;
    if (difficultySettings.name === 'impossible') {
      return i18n.language === 'sl' 
        ? '🏆 Samo legende preživijo! Mogoče te čaka presenečenje 😉'
        : '🏆 Only legends survive! You might get a surprise 😉';
    }
    return null;
  };

  const handleReset = () => {
    setWalletData(null);
  };

  if (!walletData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-primary">
              {playedGame && difficultySettings?.reward_type === 'lana8wonder' 
                ? '🔥 LEGENDARY VICTORY! 🔥'
                : playedGame ? t('dialogs.gameEnd.congratulations') : t('dialogs.gameEnd.skipTitle')
              }
            </DialogTitle>
            <DialogDescription className="text-center text-base mt-4">
              {playedGame ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    Congratulations! You've completed the {getDifficultyDisplayName()} level!
                  </p>
                  <p className="text-xl font-bold text-primary">
                    Reward: {getRewardText()}
                  </p>
                  {getRewardSubtitle() && (
                    <p className="text-base font-semibold text-primary mt-1">
                      {getRewardSubtitle()}
                    </p>
                  )}
                  <p className="text-sm">
                    Create your wallet to claim your reward.
                  </p>
                </div>
              ) : t('dialogs.gameEnd.skipDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleCreateWallet}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary-glow text-primary-foreground font-bold py-3 px-8 rounded-xl"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('dialogs.gameEnd.generating')}
                </>
              ) : !librariesLoaded ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('dialogs.gameEnd.loadingLibraries')}
                </>
              ) : (
                t('dialogs.gameEnd.createWallet')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          {/* 100 Million to Everyone Sign */}
          <div className="text-center mb-4">
            <img 
              src={hundredMillionLogo} 
              alt="100 Million to Everyone" 
              className="mx-auto w-48 h-48 object-contain"
            />
          </div>
          
          <DialogTitle className="text-center text-xl font-bold text-primary">
            {t('dialogs.gameEnd.walletReady')}
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            {t('dialogs.gameEnd.keepPrivateKeySafe')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {/* LanaCoin Address */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-primary flex items-center gap-2">
                <Key className="w-4 h-4" />
                {t('dialogs.gameEnd.lanaCoinAddress')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(walletData.lanaAddress, "LanaCoin Address")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm font-mono break-all bg-background p-2 rounded border">
              {walletData.lanaAddress}
            </p>
          </div>

          {/* Private Key WIF */}
          <div className="bg-destructive/10 p-4 rounded-lg border-destructive/20 border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-destructive">{t('dialogs.gameEnd.privateKeyWIF')}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(walletData.privateKeyWIF, "Private Key")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm font-mono break-all bg-background p-2 rounded border">
              {walletData.privateKeyWIF}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('dialogs.gameEnd.privateKeyWarning')}
            </p>
          </div>

          {/* Hidden NOSTR identity fields - kept for session data but not displayed */}
          {/* NOSTR keys are stored internally but not shown to user to reduce complexity */}

          {/* Security Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>{t('labels.info', { ns: 'common' })}:</strong> {t('help.privateKey')}
            </p>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            onClick={handleRegenerateWallet}
            disabled={isGenerating}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('dialogs.gameEnd.generating')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {t('dialogs.gameEnd.regenerateWallet')}
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleEmailAndNostr}
            className="bg-primary hover:bg-primary-glow text-primary-foreground flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            {t('dialogs.gameEnd.createNostrProfile')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameEndDialog;