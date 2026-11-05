import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Shield, Coins, RefreshCw } from 'lucide-react';

interface GoalkeeperMinigameProps {
  onEarnPoints: (points: number) => Promise<void>;
  userPoints: number;
}

type Direction = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

const STADIUM_BG = '/src/assets/images/stadium_hero_bg_1793815063010.jpg';

export const GoalkeeperMinigame: React.FC<GoalkeeperMinigameProps> = ({ onEarnPoints, userPoints }) => {
  const [difficulty, setDifficulty] = useState<'facil' | 'normal' | 'dificil'>('normal');
  const [gameState, setGameState] = useState<'READY' | 'SHOOTING' | 'RESULT'>('READY');
  const [selectedDir, setSelectedDir] = useState<Direction | null>(null);
  const [ballTarget, setBallTarget] = useState<Direction | null>(null);
  const [isSaveSuccess, setIsSaveSuccess] = useState<boolean | null>(null);
  const [earnedAmount, setEarnedAmount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  const directions: { id: Direction; label: string; x: string; y: string }[] = [
    { id: 'top-left', label: 'Arriba Izq.', x: '20%', y: '25%' },
    { id: 'top-right', label: 'Arriba Der.', x: '80%', y: '25%' },
    { id: 'center', label: 'Centro', x: '50%', y: '45%' },
    { id: 'bottom-left', label: 'Abajo Izq.', x: '20%', y: '70%' },
    { id: 'bottom-right', label: 'Abajo Der.', x: '80%', y: '70%' }
  ];

  const handleChooseDirection = (dir: Direction) => {
    if (gameState !== 'READY') return;

    setSelectedDir(dir);
    setGameState('SHOOTING');

    // AI striker shot selection based on difficulty
    let candidateDirs: Direction[] = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'];
    if (difficulty === 'facil') {
      candidateDirs = ['top-left', 'top-right', 'center'];
    }

    const chosenShot = candidateDirs[Math.floor(Math.random() * candidateDirs.length)];
    setBallTarget(chosenShot);

    // Play kick audio sound
    sounds.playStickerSlap();

    // After animation finishes (1.0s - 1.2s) evaluate result
    const animDelay = difficulty === 'dificil' ? 900 : 1200;
    setTimeout(async () => {
      const isSave = dir === chosenShot;
      setIsSaveSuccess(isSave);

      let baseReward = 150;
      if (difficulty === 'facil') baseReward = 100;
      if (difficulty === 'normal') baseReward = 200;
      if (difficulty === 'dificil') baseReward = 350;

      let reward = 25; // consolation reward
      if (isSave) {
        reward = baseReward + streak * 50;
        setStreak(prev => prev + 1);
        sounds.playFanfare();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setStreak(0);
        sounds.playPackTear();
      }

      setEarnedAmount(reward);
      await onEarnPoints(reward);
      setGameState('RESULT');
    }, animDelay);
  };

  const handlePlayAgain = () => {
    setGameState('READY');
    setSelectedDir(null);
    setBallTarget(null);
    setIsSaveSuccess(null);
  };

  // Glove positioning based on selected direction
  const getGlovePositionClass = () => {
    if (!selectedDir || gameState === 'READY') return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';

    switch (selectedDir) {
      case 'top-left':
        return 'left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 -rotate-12 scale-110';
      case 'top-right':
        return 'left-3/4 top-1/4 -translate-x-1/2 -translate-y-1/2 rotate-12 scale-110';
      case 'bottom-left':
        return 'left-1/4 top-3/4 -translate-x-1/2 -translate-y-1/2 -rotate-45 scale-110';
      case 'bottom-right':
        return 'left-3/4 top-3/4 -translate-x-1/2 -translate-y-1/2 rotate-45 scale-110';
      case 'center':
        return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-125';
    }
  };

  // Ball trajectory style with dynamic rotation & approaching zoom
  const getBallPositionStyle = () => {
    if (gameState === 'READY' || !ballTarget) {
      return {
        left: '50%',
        top: '85%',
        transform: 'translate(-50%, -50%) scale(0.6) rotate(0deg)',
        opacity: 0.9,
        transition: 'none'
      };
    }

    const targetObj = directions.find(d => d.id === ballTarget);
    if (gameState === 'SHOOTING') {
      return {
        left: targetObj?.x || '50%',
        top: targetObj?.y || '50%',
        transform: 'translate(-50%, -50%) scale(1.8) rotate(1080deg)',
        transition: 'all 1.1s cubic-bezier(0.1, 0.85, 0.25, 1)',
        opacity: 1
      };
    }

    return {
      left: targetObj?.x || '50%',
      top: targetObj?.y || '50%',
      transform: 'translate(-50%, -50%) scale(1.8) rotate(1080deg)'
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Minigame Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/30 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Minijuego de Arquero Oficial</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            Desafío de Penaltis: ¡Tapa y Gana Puntos!
          </h1>
          <p className="text-xs text-slate-300">
            Adivina hacia dónde disparará el delantero. El balón volará hacia la portería y tus guantes se moverán a tiempo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 self-start sm:self-auto">
          {/* Difficulty Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setDifficulty('facil')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                difficulty === 'facil'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fácil (+100)
            </button>
            <button
              type="button"
              onClick={() => setDifficulty('normal')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                difficulty === 'normal'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Normal (+200)
            </button>
            <button
              type="button"
              onClick={() => setDifficulty('dificil')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                difficulty === 'dificil'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Leyenda (+350)
            </button>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">TUS PUNTOS</span>
              <span className="font-mono font-black text-amber-400 text-base">{userPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Pitch / Goal Arena */}
      <div className="relative w-full h-[450px] sm:h-[500px] rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-2xl bg-slate-950">
        
        {/* Background Stadium Photo */}
        <img
          src={STADIUM_BG}
          alt="Estadio de Noche"
          className="absolute inset-0 w-full h-full object-cover opacity-60 filter brightness-90"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Football Goal Post Outline */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[85%] sm:w-[75%] h-[60%] border-4 border-white rounded-t-xl bg-gradient-to-b from-white/10 to-transparent shadow-[0_0_50px_rgba(255,255,255,0.2)]">
          {/* Net grid simulation */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Interactive Target Buttons (Direction Pickers) */}
        {gameState === 'READY' && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[85%] sm:w-[75%] h-[60%] z-30">
            {directions.map(d => (
              <button
                key={d.id}
                onClick={() => handleChooseDirection(d.id)}
                style={{ left: d.x, top: d.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-2xl bg-amber-500/80 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl backdrop-blur-md border border-amber-300 hover:scale-110 active:scale-95 transition-all animate-bounce"
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Goalkeeper Glove Hands */}
        <div
          className={`absolute z-20 transition-all duration-700 ease-out pointer-events-none ${getGlovePositionClass()}`}
        >
          <div className="flex items-center gap-4 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
            {/* Left Glove */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 border-2 border-white flex items-center justify-center text-slate-950 font-black shadow-2xl">
              <span className="text-2xl">🧤</span>
            </div>
            {/* Right Glove */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tl from-amber-600 via-yellow-400 to-amber-300 border-2 border-white flex items-center justify-center text-slate-950 font-black shadow-2xl">
              <span className="text-2xl">🧤</span>
            </div>
          </div>
        </div>

        {/* Animated Football Ball (Spinning Hexagon Pattern) */}
        <div
          className="absolute z-20 pointer-events-none filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.9)]"
          style={getBallPositionStyle()}
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 border-2 border-slate-900 overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Realistic 3D Football Pentagons */}
            <div className="absolute w-7 h-7 bg-slate-950 clip-path-pentagon top-1 left-2 rounded-sm" />
            <div className="absolute w-7 h-7 bg-slate-950 clip-path-pentagon bottom-2 right-2 rounded-sm" />
            <div className="absolute w-8 h-8 bg-slate-950 clip-path-pentagon inset-0 m-auto rounded-md" />
            <span className="text-2xl relative z-10">⚽</span>
          </div>
        </div>

        {/* Striker at Penalty Spot */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="w-10 h-2 bg-amber-400/80 rounded-full blur-xs mb-1" />
          <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            Punto de Penal
          </span>
        </div>

        {/* Result Overlay Banner */}
        {gameState === 'RESULT' && (
          <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in zoom-in-95">
            {isSaveSuccess ? (
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl">
                  <Shield className="w-10 h-10" />
                </div>
                <h2 className="font-display text-3xl font-black text-emerald-400">
                  ¡PARADÓN ESPECTACULAR!
                </h2>
                <p className="text-xs text-slate-300">
                  ¡Adivinaste la dirección del disparo y atajaste el penal!
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-sm shadow-xl mt-2">
                  <Coins className="w-5 h-5" />
                  <span>+{earnedAmount} Puntos Ganados</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-400 text-rose-400 flex items-center justify-center mx-auto shadow-2xl">
                  <span className="text-3xl">⚽</span>
                </div>
                <h2 className="font-display text-3xl font-black text-rose-400">
                  ¡GOL DEL DELANTERO!
                </h2>
                <p className="text-xs text-slate-300">
                  El balón entró por la otra esquina. ¡Buena intención!
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 text-amber-400 font-bold text-xs mt-2 border border-slate-700">
                  <Coins className="w-4 h-4" />
                  <span>+{earnedAmount} Puntos de Consolación</span>
                </div>
              </div>
            )}

            <button
              onClick={handlePlayAgain}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>JUGAR DE NUEVO</span>
            </button>
          </div>
        )}

      </div>

      {/* Minigame Rules / Instructions Footer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-center text-xs text-slate-400 space-y-2">
        <p className="font-semibold text-slate-200">
          💡 ¿Cómo funciona el minijuego?
        </p>
        <p>
          Toca uno de los 5 botones direccionales para mover los guantes del portero. Si detienes el tiro recibes <strong>+150 a +250 puntos</strong>. Usa tus puntos acumulados en la <strong>Tienda de Sobres</strong> para adquirir más sobres para tu álbum.
        </p>
      </div>

    </div>
  );
};
