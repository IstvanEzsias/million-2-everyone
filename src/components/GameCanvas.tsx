import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { toast } from "@/hooks/use-toast";
import jumpingFace from "@/assets/jumping-face.png";
import GameEndDialog from "./GameEndDialog";
import { supabase } from '@/integrations/supabase/client';
import PrizeAvailabilityBadge from './PrizeAvailabilityBadge';

interface GameState {
  price: number;
  users: number;
  jumps: number;
  gameRunning: boolean;
}

interface DifficultySettings {
  name: string;
  base_speed: number;
  obstacle_min_gap: number;
  obstacle_max_gap: number;
  speed_progression: 'linear' | 'exponential';
  speed_multiplier_max: number;
  reward_amount: number;
  reward_type: string;
  display_name_en: string;
  display_name_sl: string;
}

const GameCanvas = ({ 
  onStateChange,
  difficulty = 'intermediate'
}: { 
  onStateChange: (state: GameState) => void;
  difficulty?: string;
}) => {
  const { t, i18n } = useTranslation('game');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [availablePrizes, setAvailablePrizes] = useState<number>(0);
  const [difficultySettings, setDifficultySettings] = useState<DifficultySettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    price: 0.1,
    users: 10,
    jumps: 0,
    gameRunning: false
  });

  const [particles, setParticles] = useState<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
  }>>([]);

  const [hasShownUserCapMessage, setHasShownUserCapMessage] = useState(false);

  // Game constants
  const W = 960;
  const H = 540;
  const groundY = H - 90;
  const baseGravity = 0.3; // Base gravity that scales with speed
  const baseJumpForce = 9; // Base jump force that scales with speed
  const userCap = 8_000_000_000;
  const maxJumps = 37;
  
  // Dynamic game constants from difficulty settings
  const baseSpeed = difficultySettings?.base_speed || 5;
  const obstacleMinGap = difficultySettings?.obstacle_min_gap || 320;
  const obstacleMaxGap = difficultySettings?.obstacle_max_gap || 480;

  // Game objects
  const playerRef = useRef({ x: 120, y: groundY - 40, r: 40, vy: 0, onGround: true });
  const obstaclesRef = useRef<Array<{ x: number; w: number; h: number; counted: boolean; idx: number }>>([]);
  const speedRef = useRef(baseSpeed);
  const nextBlockIndexRef = useRef(1);

  const fmtMoney = (x: number) => {
    if (x < 1) {
      return x.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
  };
  const fmtInt = (n: number) => Math.round(n).toLocaleString();

  const createConfetti = (count = 30) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: W / 2,
        y: 80,
        vx: (Math.random() * 2 - 1) * 4,
        vy: -Math.random() * 3 - 1,
        life: 60 + Math.random() * 40
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const spawnObstacle = (xStart: number) => {
    const h = 42 + Math.random() * 38;
    const w = 24 + Math.random() * 16;
    obstaclesRef.current.push({
      x: xStart,
      w,
      h,
      counted: false,
      idx: nextBlockIndexRef.current++
    });
  };

  const jump = () => {
    if (!gameStateRef.current.gameRunning) return;
    
    const player = playerRef.current;
    if (player.onGround) {
      // Scale jump force exponentially with speed (power of 1.4)
      const speedRatio = speedRef.current / baseSpeed;
      const scaledJumpForce = baseJumpForce * Math.pow(speedRatio, 1.4);
      player.vy = -scaledJumpForce;
      player.onGround = false;
    }
  };

  const onSuccessfulJump = () => {
    const state = gameStateRef.current;
    const newState = {
      ...state,
      jumps: state.jumps + 1,
      price: state.price * 2,
      users: Math.min(userCap, state.users * 2),
      gameRunning: state.gameRunning
    };
    
    gameStateRef.current = newState;
    onStateChange(newState);

    if (state.users < userCap && newState.users >= userCap) {
      setHasShownUserCapMessage(true);
      toast({
        title: t('notifications.globalCap'),
        description: t('notifications.globalCapDescription'),
      });
      createConfetti(100);
    }

    if (newState.jumps >= maxJumps) {
      gameStateRef.current.gameRunning = false;
      createConfetti(200);
      showFinalReport();
      setShowEndDialog(true);
    }
  };

  const showFinalReport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(0, 0, W, H);
    
    ctx.fillStyle = '#000';
    ctx.font = '800 38px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Final Report - You Won!', W/2, H/2 - 80);
    
    ctx.font = '700 26px system-ui';
    ctx.fillText(`Final Price: €${fmtMoney(state.price)}`, W/2, H/2 - 20);
    ctx.fillText(`Final Users: ${fmtInt(state.users)}`, W/2, H/2 + 20);
    ctx.fillText('Jumps: 37 ✅', W/2, H/2 + 60);
    
    ctx.font = '800 32px system-ui';
    ctx.fillStyle = '#d97706';
    const rewardText = difficultySettings?.reward_type === 'lana8wonder' 
      ? '🏆 Lana8Wonder Registration! 🏆'
      : `🏆 ${difficultySettings?.reward_amount || 1} Registered Lana! 🏆`;
    ctx.fillText(rewardText, W/2, H/2 + 120);
    
    ctx.restore();
  };

  const reset = () => {
    const newState = {
      price: 0.001,
      users: 10,
      jumps: 0,
      gameRunning: true
    };
    
    gameStateRef.current = newState;
    
    speedRef.current = difficultySettings?.base_speed || baseSpeed;
    nextBlockIndexRef.current = 1;
    
    const player = playerRef.current;
    player.y = groundY - player.r;
    player.vy = 0;
    player.onGround = true;
    
    obstaclesRef.current = [];
    spawnObstacle(W + 220);
    
    onStateChange(newState);
    setParticles([]);
    setHasShownUserCapMessage(false);
  };

  // Fetch available prizes
  const fetchAvailablePrizes = async () => {
    try {
      const response = await fetch(
        'https://wrhcgufugnyquufydvwl.supabase.co/functions/v1/get-available-prizes',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch available prizes');
      }

      const data = await response.json();
      setAvailablePrizes(data.available_prizes);
    } catch (error) {
      console.error('Error fetching available prizes:', error);
      setAvailablePrizes(0);
    }
  };

  // Load difficulty settings
  useEffect(() => {
    const loadDifficultySettings = async () => {
      setIsLoadingSettings(true);
      const { data, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .eq('name', difficulty)
        .single();

      if (data && !error) {
        setDifficultySettings(data as DifficultySettings);
      }
      setIsLoadingSettings(false);
    };

    loadDifficultySettings();
  }, [difficulty]);

  // Initialize speed and start game when settings are loaded
  useEffect(() => {
    if (difficultySettings && !isLoadingSettings) {
      speedRef.current = difficultySettings.base_speed;
      gameStateRef.current.gameRunning = true;
    }
  }, [difficultySettings, isLoadingSettings]);

  useEffect(() => {
    fetchAvailablePrizes();
  }, []);

  // Load the jumping face image
  const jumpingFaceImg = useRef<HTMLImageElement | null>(null);
  
  useEffect(() => {
    const img = new Image();
    img.src = jumpingFace;
    img.onload = () => {
      jumpingFaceImg.current = img;
    };
  }, []);

  const drawSpeedometer = (ctx: CanvasRenderingContext2D) => {
    if (!difficultySettings || difficultySettings.speed_progression !== 'exponential') return;
    
    const currentSpeed = speedRef.current;
    const maxSpeed = baseSpeed * (1 + difficultySettings.speed_multiplier_max);
    const speedPercent = ((currentSpeed - baseSpeed) / (maxSpeed - baseSpeed)) * 100;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 160, 60);
    
    // Speed bar
    const barWidth = (Math.max(0, speedPercent) / 100) * 140;
    const gradient = ctx.createLinearGradient(20, 40, 160, 40);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(0.5, '#eab308');
    gradient.addColorStop(1, '#ef4444');
    ctx.fillStyle = gradient;
    ctx.fillRect(20, 45, barWidth, 15);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 45, 140, 15);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`⚡ Speed: ${currentSpeed.toFixed(1)}x`, 20, 32);
    
    ctx.restore();
  };

  const drawPriceAbovePlayer = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, price: number) => {
    ctx.save();
    
    const textY = cy - r * 1.8;
    
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold ${r * 0.6}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', cx, textY);
    
    ctx.font = `bold ${r * 0.5}px system-ui`;
    ctx.fillText(`€${fmtMoney(price)}`, cx, textY + r * 0.7);
    
    ctx.restore();
  };

  const drawFace = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.save();
    
    if (jumpingFaceImg.current) {
      const size = r * 1.4;
      const x = cx - size / 2;
      const y = cy - size / 2;
      
      const player = playerRef.current;
      const bounceOffset = player.onGround ? 0 : Math.sin(Date.now() * 0.01) * 3;
      
      ctx.drawImage(jumpingFaceImg.current, x, y + bounceOffset, size, size);
      drawPriceAbovePlayer(ctx, cx, cy + bounceOffset, r, gameStateRef.current.price);
    } else {
      ctx.fillStyle = '#000';
      ctx.font = `${r * 1.8}px Arial Black`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100', cx, cy - r * 0.2);
      
      ctx.beginPath();
      ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(cx + r * 0.25, cy - r * 0.25, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.25, r * 0.5, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.55, r * 0.9, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      
      drawPriceAbovePlayer(ctx, cx, cy, r, gameStateRef.current.price);
    }
    
    ctx.restore();
  };

  const update = () => {
    if (!gameStateRef.current.gameRunning) return;

    const player = playerRef.current;
    
    // Apply scaled gravity based on speed (power of 1.2)
    const speedRatio = speedRef.current / baseSpeed;
    const scaledGravity = baseGravity * Math.pow(speedRatio, 1.2);
    player.vy += scaledGravity;
    player.y += player.vy;
    
    const gy = groundY - player.r;
    if (player.y >= gy) {
      player.y = gy;
      player.vy = 0;
      player.onGround = true;
    }

    // Dynamic speed calculation based on difficulty
    let calculatedSpeed = baseSpeed;
    
    if (difficultySettings?.speed_progression === 'exponential') {
      const progressRatio = gameStateRef.current.jumps / maxJumps;
      const speedMultiplier = 1 + Math.pow(progressRatio, 2) * difficultySettings.speed_multiplier_max;
      calculatedSpeed = baseSpeed * speedMultiplier;
    } else if (difficultySettings?.name === 'easy') {
      // Beginner: scale increase proportionally (0.4 → 0.48 = +20%, same as original 5→6)
      calculatedSpeed = baseSpeed + Math.min(0.08, gameStateRef.current.jumps * 0.016);
    } else {
      // Intermediate: keep original linear progression
      calculatedSpeed = baseSpeed + Math.min(1, gameStateRef.current.jumps * 0.2);
    }
    
    speedRef.current = calculatedSpeed;

    // Move obstacles
    const speed = speedRef.current;
    for (const o of obstaclesRef.current) {
      o.x -= speed;
    }

    // Remove off-screen obstacles
    while (obstaclesRef.current.length && obstaclesRef.current[0].x + obstaclesRef.current[0].w < -60) {
      obstaclesRef.current.shift();
    }

    // Spawn new obstacles
    const last = obstaclesRef.current[obstaclesRef.current.length - 1];
    if (last && nextBlockIndexRef.current <= maxJumps) {
      let gapMultiplier = 1;
      
      if (difficultySettings?.speed_progression === 'exponential') {
        const progressRatio = gameStateRef.current.jumps / maxJumps;
        gapMultiplier = 1 - (progressRatio * 0.3);
      }
      
      const effectiveMinGap = obstacleMinGap * gapMultiplier;
      const effectiveMaxGap = obstacleMaxGap * gapMultiplier;
      
      if (last.x < W - (effectiveMinGap + Math.random() * (effectiveMaxGap - effectiveMinGap))) {
        spawnObstacle(W + 60 + Math.random() * 120);
      }
    }

    // Collision detection and jump counting
    for (const o of obstaclesRef.current) {
      if (!o.counted && o.x + o.w < player.x - player.r) {
        o.counted = true;
        onSuccessfulJump();
      }

      const rx = o.x, ry = groundY - o.h, rw = o.w, rh = o.h;
      const cx = Math.max(rx, Math.min(player.x, rx + rw));
      const cy = Math.max(ry, Math.min(player.y, ry + rh));
      const dx = player.x - cx;
      const dy = player.y - cy;
      
      const collisionRadius = player.r * 0.7;
      if (dx * dx + dy * dy < collisionRadius * collisionRadius) {
        gameStateRef.current.gameRunning = false;
      }
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffe6e6';
    ctx.fillRect(0, groundY, W, H - groundY);
    
    ctx.strokeStyle = '#d77';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    drawFace(ctx, playerRef.current.x, playerRef.current.y, playerRef.current.r);
    drawSpeedometer(ctx);

    ctx.fillStyle = '#f44';
    for (const o of obstaclesRef.current) {
      ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
      ctx.strokeStyle = '#a11';
      ctx.strokeRect(o.x, groundY - o.h, o.w, o.h);
      
      ctx.fillStyle = '#fff';
      ctx.font = '700 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(o.idx), o.x + o.w / 2, groundY - o.h / 2 + 5);
      ctx.fillStyle = '#f44';
    }

    setParticles(prev => {
      return prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.1,
        life: p.life - 1
      })).filter(p => p.life > 0);
    });

    particles.forEach(p => {
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x, p.y, 3, 3);
    });
  };

  // Game loop
  useEffect(() => {
    if (!difficultySettings) return; // Don't start loop until settings loaded

    let frameId = 0;
    let lastTime = 0;
    let acc = 0;
    const step = 1000 / 60;

    const loop = (time: number) => {
      if (!lastTime) lastTime = time;
      acc += time - lastTime;
      lastTime = time;

      while (acc >= step) {
        update();
        acc -= step;
      }

      draw();
      frameId = requestAnimationFrame(loop);
    };

    reset();
    frameId = requestAnimationFrame(loop);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [difficultySettings]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoadingSettings) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-xl font-bold">{t('status.loading', 'Loading game...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto game-canvas rounded-2xl cursor-pointer"
          onClick={jump}
        />
        
        {availablePrizes > 0 && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            {availablePrizes} prizes left
          </div>
        )}
      </div>
      
      <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={jump}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-xl text-lg"
        >
          {t('controls.jump')}
        </button>
        
        <button
          onClick={reset}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-3 px-8 rounded-xl text-lg"
        >
          {t('controls.restart')}
        </button>
      </div>

      <GameEndDialog 
        open={showEndDialog} 
        onOpenChange={setShowEndDialog}
        playedGame={true}
        difficulty={difficulty}
        difficultySettings={difficultySettings}
      />
    </div>
  );
};

export default GameCanvas;
