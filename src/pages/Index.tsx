import GameHeader from "@/components/GameHeader";
import GameCanvas from "@/components/GameCanvas";
import GameStats from "@/components/GameStats";
import { useState } from "react";

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

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        <main>
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
