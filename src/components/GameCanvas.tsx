import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { toast } from "@/hooks/use-toast";
import jumpingFace from "@/assets/jumping-face.png";
import GameEndDialog from "./GameEndDialog";
import { supabase } from '@/integrations/supabase/client';

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
    users: 10,
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
  const [availablePrizes, setAvailablePrizes] = useState<number>(0);

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
    ctx.fillText('🏆 1 Registered Lana Earned! 🏆', W/2, H/2 + 120);
    
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

  // Fetch available prizes
  const fetchAvailablePrizes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-available-prizes');
      if (error) throw error;
      if (data?.success) {
        setAvailablePrizes(data.availablePrizes);
      }
    } catch (error) {
      console.error('❌ Error fetching prizes:', error);
    }
  };

  useEffect(() => {
    // Fetch prizes only once on component load
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

  const drawHat = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, jumpCount: number) => {
    ctx.save();
    
    // Hat position above the face
    const hatY = cy - r * 1.8;
    const hatSize = r * 0.8;
    
    // Different hat designs based on jump count (0-36)
    switch (jumpCount) {
      case 0: // Baseball cap
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        ctx.fillRect(cx - hatSize*0.8, hatY + hatSize/2, hatSize*1.6, hatSize/6);
        break;
        
      case 1: // Beanie
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        break;
        
      case 2: // Party hat
        ctx.fillStyle = '#ffe66d';
        ctx.beginPath();
        ctx.moveTo(cx, hatY - hatSize/2);
        ctx.lineTo(cx - hatSize/2, hatY + hatSize/2);
        ctx.lineTo(cx + hatSize/2, hatY + hatSize/2);
        ctx.closePath();
        ctx.fill();
        // Pom pom
        ctx.beginPath();
        ctx.arc(cx, hatY - hatSize/2, hatSize/8, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6b6b';
        ctx.fill();
        break;
        
      case 3: // Chef hat
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, hatY, hatSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/6);
        ctx.strokeRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/6);
        break;
        
      case 4: // Beret
        ctx.fillStyle = '#8b5a3c';
        ctx.beginPath();
        ctx.ellipse(cx, hatY + hatSize/4, hatSize/2, hatSize/4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 5: // Fedora
        ctx.fillStyle = '#654321';
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        ctx.fillRect(cx - hatSize*0.7, hatY + hatSize/2, hatSize*1.4, hatSize/8);
        // Band
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/12);
        break;
        
      case 6: // Cowboy hat
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        // Brim with curves
        ctx.beginPath();
        ctx.ellipse(cx, hatY + hatSize/2, hatSize*0.8, hatSize/6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 7: // Sailor hat
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000080';
        ctx.lineWidth = 2;
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        ctx.strokeRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        ctx.fillRect(cx - hatSize*0.6, hatY + hatSize/2, hatSize*1.2, hatSize/8);
        break;
        
      case 8: // Construction hard hat
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        ctx.stroke();
        break;
        
      case 9: // Propeller beanie
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        // Propeller
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - hatSize/2, hatY - hatSize/4);
        ctx.lineTo(cx + hatSize/2, hatY - hatSize/4);
        ctx.stroke();
        break;
        
      case 10: // Top hat
        ctx.fillStyle = '#000';
        ctx.fillRect(cx - hatSize/3, hatY - hatSize/2, hatSize*2/3, hatSize);
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/2, hatSize, hatSize/8);
        break;
        
      case 11: // Sombrero
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/3, 0, Math.PI, true);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, hatY + hatSize/2, hatSize, hatSize/6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 12: // Wizard hat
        ctx.fillStyle = '#4b0082';
        ctx.beginPath();
        ctx.moveTo(cx, hatY - hatSize);
        ctx.lineTo(cx - hatSize/2, hatY + hatSize/2);
        ctx.lineTo(cx + hatSize/2, hatY + hatSize/2);
        ctx.closePath();
        ctx.fill();
        // Stars
        ctx.fillStyle = '#ffd700';
        ctx.font = `${hatSize/4}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('✦', cx - hatSize/4, hatY - hatSize/2);
        ctx.fillText('✦', cx + hatSize/4, hatY - hatSize/3);
        break;
        
      case 13: // Graduation cap
        ctx.fillStyle = '#000';
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/8);
        ctx.fillRect(cx - hatSize/3, hatY - hatSize/6, hatSize*2/3, hatSize/4);
        // Tassel
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + hatSize/2, hatY);
        ctx.lineTo(cx + hatSize/2 + hatSize/4, hatY + hatSize/3);
        ctx.stroke();
        break;
        
      case 14: // Military helmet
        ctx.fillStyle = '#4a5d23';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
        
      case 15: // Viking helmet
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        // Horns
        ctx.fillStyle = '#f5deb3';
        ctx.beginPath();
        ctx.ellipse(cx - hatSize/2, hatY, hatSize/8, hatSize/3, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + hatSize/2, hatY, hatSize/8, hatSize/3, 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 16: // Crown (simple)
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/4);
        // Crown points
        for (let i = 0; i < 5; i++) {
          const x = cx - hatSize/2 + (i * hatSize/4);
          ctx.beginPath();
          ctx.moveTo(x, hatY + hatSize/3);
          ctx.lineTo(x + hatSize/8, hatY);
          ctx.lineTo(x + hatSize/4, hatY + hatSize/3);
          ctx.fill();
        }
        break;
        
      case 17: // Santa hat
        ctx.fillStyle = '#dc143c';
        ctx.beginPath();
        ctx.moveTo(cx, hatY - hatSize/2);
        ctx.lineTo(cx - hatSize/2, hatY + hatSize/2);
        ctx.lineTo(cx + hatSize/2, hatY + hatSize/2);
        ctx.closePath();
        ctx.fill();
        // White trim
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/2, hatSize, hatSize/8);
        // Pom pom
        ctx.beginPath();
        ctx.arc(cx, hatY - hatSize/2, hatSize/8, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 18: // Bowler hat
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        ctx.fillRect(cx - hatSize*0.6, hatY + hatSize/2, hatSize*1.2, hatSize/10);
        break;
        
      case 19: // Jester hat
        ctx.fillStyle = '#9932cc';
        ctx.beginPath();
        ctx.moveTo(cx, hatY + hatSize/2);
        ctx.lineTo(cx - hatSize/3, hatY - hatSize/3);
        ctx.lineTo(cx, hatY - hatSize/2);
        ctx.lineTo(cx + hatSize/3, hatY - hatSize/3);
        ctx.closePath();
        ctx.fill();
        // Bells
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(cx - hatSize/3, hatY - hatSize/3, hatSize/12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + hatSize/3, hatY - hatSize/3, hatSize/12, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 20: // Royal crown
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/3);
        // Elaborate crown points with gems
        for (let i = 0; i < 3; i++) {
          const x = cx - hatSize/3 + (i * hatSize/3);
          ctx.beginPath();
          ctx.moveTo(x, hatY + hatSize/3);
          ctx.lineTo(x + hatSize/6, hatY - hatSize/3);
          ctx.lineTo(x + hatSize/3, hatY + hatSize/3);
          ctx.fill();
          // Gems
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(x + hatSize/6, hatY, hatSize/12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd700';
        }
        break;
        
      case 21: // Space helmet
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/4, hatSize/2, 0, Math.PI * 2);
        ctx.stroke();
        // Reflection
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(cx - hatSize/4, hatY, hatSize/6, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 22: // Pharaoh headdress
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        // Striped pattern
        ctx.fillStyle = '#0000ff';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(cx - hatSize/2, hatY + i * hatSize/6, hatSize, hatSize/12);
        }
        break;
        
      case 23: // Pirate hat
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        // Skull and crossbones
        ctx.fillStyle = '#ffffff';
        ctx.font = `${hatSize/3}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('☠', cx, hatY + hatSize/4);
        break;
        
      case 24: // Detective hat
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        // Front and back brims
        ctx.fillRect(cx - hatSize*0.6, hatY + hatSize/2, hatSize*1.2, hatSize/8);
        ctx.fillRect(cx - hatSize*0.4, hatY - hatSize/6, hatSize*0.8, hatSize/8);
        break;
        
      case 25: // Mushroom hat
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        // White spots
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - hatSize/4, hatY + hatSize/6, hatSize/12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + hatSize/4, hatY + hatSize/6, hatSize/12, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 26: // Samurai helmet
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        // Horn decoration
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(cx, hatY);
        ctx.lineTo(cx - hatSize/6, hatY - hatSize/3);
        ctx.lineTo(cx + hatSize/6, hatY - hatSize/3);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 27: // Witch hat
        ctx.fillStyle = '#4b0082';
        ctx.beginPath();
        ctx.moveTo(cx, hatY - hatSize);
        ctx.lineTo(cx - hatSize/2, hatY + hatSize/2);
        ctx.lineTo(cx + hatSize/2, hatY + hatSize/2);
        ctx.closePath();
        ctx.fill();
        // Buckle
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - hatSize/8, hatY + hatSize/4, hatSize/4, hatSize/6);
        break;
        
      case 28: // Flower crown
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/8);
        // Flowers
        const flowers = ['🌸', '🌼', '🌺'];
        ctx.font = `${hatSize/4}px Arial`;
        for (let i = 0; i < 3; i++) {
          ctx.fillText(flowers[i % 3], cx - hatSize/3 + i * hatSize/3, hatY + hatSize/3);
        }
        break;
        
      case 29: // Roman helmet
        ctx.fillStyle = '#b8860b';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/2, 0, Math.PI, true);
        ctx.fill();
        // Plume
        ctx.fillStyle = '#dc143c';
        ctx.fillRect(cx - hatSize/12, hatY - hatSize/2, hatSize/6, hatSize/2);
        break;
        
      case 30: // Ice crown
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/4);
        // Icicle points
        for (let i = 0; i < 4; i++) {
          const x = cx - hatSize/2 + (i * hatSize/3);
          ctx.beginPath();
          ctx.moveTo(x, hatY + hatSize/3);
          ctx.lineTo(x + hatSize/6, hatY - hatSize/4);
          ctx.lineTo(x + hatSize/3, hatY + hatSize/3);
          ctx.fill();
        }
        break;
        
      case 31: // Fire crown
        ctx.fillStyle = '#ff4500';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/4);
        // Flame points
        for (let i = 0; i < 4; i++) {
          const x = cx - hatSize/2 + (i * hatSize/3);
          ctx.fillStyle = i % 2 ? '#ff4500' : '#ffd700';
          ctx.beginPath();
          ctx.moveTo(x, hatY + hatSize/3);
          ctx.bezierCurveTo(x + hatSize/12, hatY - hatSize/6, x + hatSize/6, hatY - hatSize/4, x + hatSize/3, hatY + hatSize/3);
          ctx.fill();
        }
        break;
        
      case 32: // Diamond crown
        ctx.fillStyle = '#e6e6fa';
        ctx.strokeStyle = '#4169e1';
        ctx.lineWidth = 2;
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/3);
        ctx.strokeRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/3);
        // Diamond shapes
        for (let i = 0; i < 3; i++) {
          const x = cx - hatSize/3 + (i * hatSize/3);
          ctx.beginPath();
          ctx.moveTo(x + hatSize/6, hatY + hatSize/3);
          ctx.lineTo(x + hatSize/12, hatY);
          ctx.lineTo(x + hatSize/6, hatY - hatSize/6);
          ctx.lineTo(x + hatSize/4, hatY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
        
      case 33: // Rainbow crown
        const rainbowColors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff'];
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/4);
        for (let i = 0; i < 6; i++) {
          const x = cx - hatSize/2 + (i * hatSize/6);
          ctx.fillStyle = rainbowColors[i];
          ctx.beginPath();
          ctx.moveTo(x, hatY + hatSize/3);
          ctx.lineTo(x + hatSize/12, hatY - hatSize/6);
          ctx.lineTo(x + hatSize/6, hatY + hatSize/3);
          ctx.fill();
        }
        break;
        
      case 34: // Crystal crown
        ctx.fillStyle = '#dda0dd';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/3);
        // Crystal formations
        for (let i = 0; i < 5; i++) {
          const x = cx - hatSize/2 + (i * hatSize/4);
          ctx.fillStyle = i % 2 ? '#dda0dd' : '#ba55d3';
          ctx.beginPath();
          ctx.moveTo(x, hatY + hatSize/3);
          ctx.lineTo(x + hatSize/8, hatY - hatSize/4);
          ctx.lineTo(x + hatSize/4, hatY + hatSize/3);
          ctx.fill();
        }
        break;
        
      case 35: // Solar crown
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/3, hatSize/3, 0, Math.PI * 2);
        ctx.fill();
        // Sun rays
        ctx.strokeStyle = '#ff8c00';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const startX = cx + Math.cos(angle) * hatSize/3;
          const startY = hatY + hatSize/3 + Math.sin(angle) * hatSize/3;
          const endX = cx + Math.cos(angle) * hatSize/2;
          const endY = hatY + hatSize/3 + Math.sin(angle) * hatSize/2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        break;
        
      case 36: // Ultimate cosmic crown
        // Base crown
        ctx.fillStyle = '#4b0082';
        ctx.fillRect(cx - hatSize/2, hatY + hatSize/3, hatSize, hatSize/3);
        // Cosmic energy
        ctx.fillStyle = '#9400d3';
        for (let i = 0; i < 7; i++) {
          const x = cx - hatSize/2 + (i * hatSize/6);
          ctx.beginPath();
          ctx.moveTo(x, hatY + hatSize/3);
          ctx.lineTo(x + hatSize/12, hatY - hatSize/2);
          ctx.lineTo(x + hatSize/6, hatY + hatSize/3);
          ctx.fill();
        }
        // Stars and sparkles
        ctx.fillStyle = '#ffffff';
        ctx.font = `${hatSize/6}px Arial`;
        ctx.fillText('✦', cx - hatSize/3, hatY);
        ctx.fillText('✦', cx, hatY - hatSize/4);
        ctx.fillText('✦', cx + hatSize/3, hatY);
        // Central gem
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(cx, hatY + hatSize/6, hatSize/8, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      default:
        // Default hat for any edge cases
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - hatSize/2, hatY, hatSize, hatSize/2);
        break;
    }
    
    ctx.restore();
  };

  const drawPriceOnHat = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, price: number) => {
    ctx.save();
    
    // Position above the hat
    const textY = cy - r * 2.3;
    
    // Money symbol (first line)
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold ${r * 0.4}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', cx, textY);
    
    // Price number (second line)
    ctx.font = `bold ${r * 0.35}px system-ui`;
    ctx.fillText(`€${fmtMoney(price)}`, cx, textY + r * 0.5);
    
    ctx.restore();
  };

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
      
      // Draw hat above the face
      drawHat(ctx, cx, cy + bounceOffset, r, gameStateRef.current.jumps);
      
      // Draw price on hat
      drawPriceOnHat(ctx, cx, cy + bounceOffset, r, gameStateRef.current.price);
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
      
      // Draw hat above the fallback face too
      drawHat(ctx, cx, cy, r, gameStateRef.current.jumps);
      drawPriceOnHat(ctx, cx, cy, r, gameStateRef.current.price);
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
        
        {/* Prize availability display in the top area */}
        <div className="absolute top-4 right-6 pointer-events-none">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-full border-2 border-emerald-300 shadow-2xl backdrop-blur-sm">
            <div className="text-sm font-bold text-center flex items-center gap-2">
              <span>🎁</span>
              <span>{availablePrizes.toLocaleString()} Prizes</span>
            </div>
          </div>
        </div>

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