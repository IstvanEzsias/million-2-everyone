import GameHeader from "@/components/GameHeader";
import GameCanvas from "@/components/GameCanvas";
import GameStats from "@/components/GameStats";
import { useState, useEffect } from "react";
import { setReturnUrlData, getReturnUrlData } from "@/utils/sessionStorage";

interface GameState {
  price: number;
  users: number;
  jumps: number;
  gameRunning: boolean;
}

const Index = () => {
  const [gameState, setGameState] = useState<GameState>({
    price: 0.001,
    users: 100,
    jumps: 0,
    gameRunning: true
  });
  const [returnUrlInfo, setReturnUrlInfo] = useState<{url: string, siteName?: string} | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        <main>
          {/* Return URL info */}
          {returnUrlInfo && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm">
                <span>🔗</span>
                <span>
                  You'll return to {returnUrlInfo.siteName || 'the referring site'} after creating your profile
                </span>
              </div>
            </div>
          )}

          {/* Header with logo and title */}
          <GameHeader />
          
          {/* Game stats display */}
          <GameStats gameState={gameState} />
          
          {/* Game canvas */}
          <div className="flex justify-center">
            <GameCanvas onStateChange={setGameState} />
          </div>
          
          {/* Footer info */}
          <footer className="mt-12 text-center text-muted-foreground">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-primary mb-2">What's next</h3>
              <p className="mb-4">
                After you complete the game, you'll create your Lana Wallet and sign your profile via the decentralised Nostr protocol. From then on, you own your data—your private key stays with you and unlocks access to 20+ apps across Lana World.
              </p>
              <div className="text-sm opacity-75">
                Lana is owned by everyone who participates this eco system. Let's co-create the new reality
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
