import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { toast } from "@/hooks/use-toast";
import jumpingFace from "@/assets/jumping-face.png";
import GameEndDialog from "./GameEndDialog";

interface GameState {
  price: number;
  users: number;
  jumps: number;
  gameRunning: boolean;
}

const GameCanvas = ({ onStateChange }: { onStateChange: (state: GameState) => void }) => {
  const { t } = useTranslation('game');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    price: 0.001,
    users: 100,
    jumps: 0,
    gameRunning: true
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
  const gravity = 0.3; // Much slower
  const jumpForce = 9; // Much slower
  const baseSpeed = 5; // Much slower
  const obstacleMinGap = 320; // Much wider for more delay
  const obstacleMaxGap = 480;
  const target = 100_000_000;
  const userCap = 8_000_000_000;
  const maxJumps = 37;

  // Game objects
  const playerRef = useRef({ x: 120, y: groundY - 40, r: 40, vy: 0, onGround: true }); // Reduced radius from 50 to 40
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
      player.vy = -jumpForce;
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
    
    // Update the ref with new state
    gameStateRef.current = newState;
    
    // Notify parent component with new state
    onStateChange(newState);

    if (newState.users >= userCap && !hasShownUserCapMessage) {
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
    ctx.fillText('🏆 1 Registered Lana Earned! 🏆', W/2, H/2 + 120);
    
    ctx.restore();
  };

  const reset = () => {
    const newState = {
      price: 0.001,
      users: 100,
      jumps: 0,
      gameRunning: true
    };
    
    gameStateRef.current = newState;
    
    speedRef.current = baseSpeed;
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

  // Load the jumping face image
  const jumpingFaceImg = useRef<HTMLImageElement | null>(null);
  
  useEffect(() => {
    const img = new Image();
    img.src = jumpingFace;
    img.onload = () => {
      jumpingFaceImg.current = img;
    };
  }, []);

  const drawFace = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.save();
    
    if (jumpingFaceImg.current) {
      // Draw the custom jumping face image - smaller size for better gameplay
      const size = r * 1.4; // Reduced from r * 2 to r * 1.4
      const x = cx - size / 2;
      const y = cy - size / 2;
      
      // Add a slight bounce effect when jumping
      const player = playerRef.current;
      const bounceOffset = player.onGround ? 0 : Math.sin(Date.now() * 0.01) * 3;
      
      ctx.drawImage(jumpingFaceImg.current, x, y + bounceOffset, size, size);
    } else {
      // Fallback to drawn face if image hasn't loaded
      ctx.fillStyle = '#000';
      ctx.font = `${r * 1.8}px Arial Black`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100', cx, cy - r * 0.2);
      
      // Draw eyes (pupils)
      ctx.beginPath();
      ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(cx + r * 0.25, cy - r * 0.25, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      
      // Draw smile
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.25, r * 0.5, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
      
      // Draw chin
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.55, r * 0.9, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const update = () => {
    if (!gameStateRef.current.gameRunning) return;

    const player = playerRef.current;
    
    // Player physics
    player.vy += gravity;
    player.y += player.vy;
    
    const gy = groundY - player.r;
    if (player.y >= gy) {
      player.y = gy;
      player.vy = 0;
      player.onGround = true;
    }

    // Move obstacles
    const speed = speedRef.current;
    for (const o of obstaclesRef.current) {
      o.x -= speed;
    }

    // Remove off-screen obstacles
    while (obstaclesRef.current.length && obstaclesRef.current[0].x + obstaclesRef.current[0].w < -60) {
      obstaclesRef.current.shift();
    }

    // Spawn new obstacles (but only if we haven't reached max jumps)
    const last = obstaclesRef.current[obstaclesRef.current.length - 1];
    if (last && nextBlockIndexRef.current <= maxJumps) {
      const s = Math.min(1.6, speed / baseSpeed);
      if (last.x < W - (obstacleMinGap * s + Math.random() * (obstacleMaxGap * s - obstacleMinGap * s))) {
        spawnObstacle(W + 60 + Math.random() * 120);
      }
    }

    // Collision detection and jump counting
    for (const o of obstaclesRef.current) {
      if (!o.counted && o.x + o.w < player.x - player.r) {
        o.counted = true;
        onSuccessfulJump();
      }

      // Collision detection - more forgiving hitbox
      const rx = o.x, ry = groundY - o.h, rw = o.w, rh = o.h;
      const cx = Math.max(rx, Math.min(player.x, rx + rw));
      const cy = Math.max(ry, Math.min(player.y, ry + rh));
      const dx = player.x - cx;
      const dy = player.y - cy;
      
      // Reduced collision radius for more forgiving gameplay
      const collisionRadius = player.r * 0.7; // 70% of visual radius for more forgiving collisions
      if (dx * dx + dy * dy < collisionRadius * collisionRadius) {
        gameStateRef.current.gameRunning = false;
        setShowEndDialog(true); // Show dialog for testing purposes
      }
    }

    // Slower speed increase
    speedRef.current = baseSpeed + Math.min(1, gameStateRef.current.jumps * 0.2);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // Draw ground
    ctx.fillStyle = '#ffe6e6';
    ctx.fillRect(0, groundY, W, H - groundY);
    
    ctx.strokeStyle = '#d77';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Draw player
    drawFace(ctx, playerRef.current.x, playerRef.current.y, playerRef.current.r);

    // Draw obstacles
    ctx.fillStyle = '#f44';
    for (const o of obstaclesRef.current) {
      ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
      ctx.strokeStyle = '#a11';
      ctx.strokeRect(o.x, groundY - o.h, o.w, o.h);
      
      // Draw obstacle number
      ctx.fillStyle = '#fff';
      ctx.font = '700 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(o.idx), o.x + o.w / 2, groundY - o.h / 2 + 5);
      ctx.fillStyle = '#f44';
    }

    // Draw particles
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
      requestAnimationFrame(loop);
    };

    // Initialize game
    reset();
    requestAnimationFrame(loop);

    // Cleanup
    return () => {
      // Animation frame cleanup handled by React
    };
  }, []);

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
        
        {/* Price overlay in the middle of the game */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-3 py-2 md:px-6 md:py-3 rounded-xl border-2 border-primary-glow shadow-lg">
            <div className="text-xs md:text-sm font-semibold opacity-90 mb-1 text-center">
              {t('stats.price')}
            </div>
            <div className="text-lg md:text-2xl font-black text-center">
              €{fmtMoney(gameStateRef.current.price)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <button
          onClick={jump}
          className="bg-primary hover:bg-primary-glow text-primary-foreground font-bold py-3 px-6 rounded-xl shadow-button-custom btn-press transition-all duration-200"
        >
          {t('controls.jump')}
        </button>
        <button
          onClick={reset}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-3 px-6 rounded-xl shadow-button-custom btn-press transition-all duration-200"
        >
          {t('controls.restart')}
        </button>
      </div>
      
      <GameEndDialog 
        open={showEndDialog} 
        onOpenChange={setShowEndDialog}
        playedGame={true}
      />
    </div>
  );
};

export default GameCanvas;