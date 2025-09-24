import lanaLogo from "@/assets/lana-logo.png";
import { useTranslation } from 'react-i18next';

const GameHeader = () => {
  const { t } = useTranslation('game');
  return (
    <header className="w-full text-center py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="mb-6 animate-bounce-in">
          <img 
            src={lanaLogo} 
            alt="100 Million to Everyone Logo" 
            className="mx-auto w-64 h-64 md:w-80 md:h-80 object-contain glow-primary rounded-2xl"
          />
        </div>
        
        {/* Main Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-red-400 mb-4 tracking-tight">
          {t('header.title')}
        </h1>
        
        {/* Game instructions */}
        <div className="mt-8 p-6 bg-card rounded-xl shadow-card-custom border-3 border-primary max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-primary mb-2">{t('header.howToPlay')}</h2>
          <p className="text-black">
            {t('header.instructions')}
          </p>
        </div>
      </div>
    </header>
  );
};

export default GameHeader;