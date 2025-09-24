import { useTranslation } from 'react-i18next';

interface GameState {
  price: number;
  users: number;
  jumps: number;
  gameRunning: boolean;
}

const GameStats = ({ gameState }: { gameState: GameState }) => {
  const { t } = useTranslation('game');
  const fmtMoney = (x: number) => x.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtInt = (n: number) => Math.round(n).toLocaleString();
  const maxJumps = 37;

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Price Display */}
        <div className="bg-card rounded-xl p-4 border-3 border-primary shadow-card-custom">
          <div className="text-sm font-semibold text-muted-foreground mb-1">
            {t('stats.price')}
          </div>
          <div className="text-2xl font-black text-primary">
            €{fmtMoney(gameState.price)}
          </div>
        </div>

        {/* Users Display */}
        <div className="bg-card rounded-xl p-4 border-3 border-secondary shadow-card-custom">
          <div className="text-sm font-semibold text-muted-foreground mb-1">
            {t('stats.users')}
          </div>
          <div className="text-2xl font-black text-secondary">
            {fmtInt(gameState.users)}
          </div>
        </div>

        {/* Jumps Progress */}
        <div className="bg-card rounded-xl p-4 border-3 border-accent shadow-card-custom">
          <div className="text-sm font-semibold text-muted-foreground mb-1">
            {t('stats.progress')}
          </div>
          <div className="text-2xl font-black text-accent">
            {gameState.jumps} / {maxJumps}
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(gameState.jumps / maxJumps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="mt-4 text-center">
        {gameState.jumps === 0 && gameState.gameRunning && (
          <div className="text-muted-foreground">
            {t('status.initial')}
          </div>
        )}
        
        {gameState.jumps > 0 && gameState.jumps < maxJumps && gameState.gameRunning && (
          <div className="text-primary font-semibold">
            {t('status.inProgress')}
          </div>
        )}
        
        {gameState.jumps >= maxJumps && (
          <div className="text-secondary font-bold text-lg animate-pulse-glow">
            {t('status.completed')}
          </div>
        )}
        
        {!gameState.gameRunning && gameState.jumps < maxJumps && (
          <div className="text-destructive font-semibold">
            {t('status.gameOver')}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameStats;