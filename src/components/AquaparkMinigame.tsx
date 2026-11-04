import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Trophy, Coins, RefreshCw, Zap, ArrowLeft, ArrowRight, Play, ShieldAlert, Award } from 'lucide-react';

interface AquaparkMinigameProps {
  onEarnPoints: (points: number) => Promise<void>;
  userPoints: number;
}

export const AquaparkMinigame: React.FC<AquaparkMinigameProps> = ({ onEarnPoints, userPoints }) => {
  const [wager, setWager] = useState<number>(100);
  const [gameState, setGameState] = useState<'IDLE' | 'MATCHMAKING' | 'RACING' | 'RESULT'>('IDLE');
  const [opponentName, setOpponentName] = useState<string>('GolazoMaster');
  
  // Race state
  const [playerPos, setPlayerPos] = useState<number>(0); // 0 to 100%
  const [opponentPos, setOpponentPos] = useState<number>(0);
  const [playerLane, setPlayerLane] = useState<number>(0); // -1: Left, 0: Center, 1: Right
  const [opponentLane, setOpponentLane] = useState<number>(0);
  const [playerSpeed, setPlayerSpeed] = useState<number>(1);
  const [turboActive, setTurboActive] = useState<boolean>(false);
  const [raceWinner, setRaceWinner] = useState<'PLAYER' | 'OPPONENT' | null>(null);

  const requestRef = useRef<number | null>(null);

  const opponents = ['GolazoMaster', 'PaniniFan26', 'CromoCollector', 'SuperRider2026', 'MundialKing'];

  const handleStartMatch = () => {
    if (userPoints < wager) {
      alert(`Necesitas al menos ${wager} puntos para apostar.`);
      return;
    }

    setGameState('MATCHMAKING');
    const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)];
    setOpponentName(randomOpponent);

    setTimeout(() => {
      setGameState('RACING');
      setPlayerPos(0);
      setOpponentPos(0);
      setPlayerLane(0);
      setOpponentLane(Math.random() > 0.5 ? 1 : -1);
      setPlayerSpeed(1);
      setRaceWinner(null);
      sounds.playCoin();
    }, 1500);
  };

  // Main Race Loop
  useEffect(() => {
    if (gameState !== 'RACING') return;

    const interval = setInterval(() => {
      setPlayerPos(prevP => {
        const nextP = prevP + (turboActive ? 1.8 : 1.1) * (0.9 + Math.random() * 0.4);
        if (nextP >= 100) {
          finishRace('PLAYER');
          return 100;
        }
        return nextP;
      });

      setOpponentPos(prevO => {
        const nextO = prevO + 1.2 * (0.85 + Math.random() * 0.45);
        if (nextO >= 100) {
          finishRace('OPPONENT');
          return 100;
        }
        return nextO;
      });

      // AI opponent changes lane occasionally
      if (Math.random() < 0.15) {
        setOpponentLane(Math.floor(Math.random() * 3) - 1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, turboActive]);

  const finishRace = async (winner: 'PLAYER' | 'OPPONENT') => {
    if (gameState === 'RESULT') return;
    setGameState('RESULT');
    setRaceWinner(winner);

    if (winner === 'PLAYER') {
      sounds.playFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 }
      });
      // Win double wager!
      await onEarnPoints(wager * 2);
    } else {
      sounds.playPackTear();
      // Lose wager (deduct wager amount by earning negative/0 payout, server handles deduct)
      await onEarnPoints(-wager);
    }
  };

  const handleTurbo = () => {
    if (turboActive) return;
    setTurboActive(true);
    sounds.playStickerSlap();
    setTimeout(() => setTurboActive(false), 1500);
  };

  const handleSteer = (dir: -1 | 1) => {
    setPlayerLane(prev => Math.max(-1, Math.min(1, prev + dir)));
    sounds.playStickerSlap();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/30 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>Aquapark.io Fútbol Slide 1v1</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            Carrera Tobogán Online 1v1
          </h1>
          <p className="text-xs text-slate-300">
            Compite contra otro jugador en el tobogán gigante. ¡Apuesta tus puntos y el 1er lugar se lleva todo el pozo!
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 shrink-0">
          <Coins className="w-5 h-5 text-amber-400" />
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">TUS PUNTOS</span>
            <span className="font-mono font-black text-amber-400 text-base">{userPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Main Game Card */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* State 1: IDLE / Select Wager */}
        {gameState === 'IDLE' && (
          <div className="text-center py-8 space-y-6 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center mx-auto shadow-2xl animate-bounce">
              <span className="text-4xl">🏄‍♂️</span>
            </div>

            <div>
              <h3 className="font-display font-black text-2xl text-white">Selecciona tu Apuesta</h3>
              <p className="text-xs text-slate-400 mt-1">
                Compite 1v1. El ganador de la carrera se lleva el doble de los puntos apostados.
              </p>
            </div>

            {/* Wager Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 250, 500].map(amt => (
                <button
                  key={amt}
                  onClick={() => setWager(amt)}
                  className={`py-3 px-2 rounded-2xl text-xs font-mono font-bold transition-all border ${
                    wager === amt
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 border-cyan-300 shadow-lg scale-105'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {amt} pts
                </button>
              ))}
            </div>

            <button
              onClick={handleStartMatch}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>BUSCAR OPONENTE (Apostar {wager} pts)</span>
            </button>
          </div>
        )}

        {/* State 2: MATCHMAKING */}
        {gameState === 'MATCHMAKING' && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="font-display font-extrabold text-xl text-white">Buscando rival online...</h3>
            <p className="text-xs text-cyan-400 font-bold animate-pulse">
              Encontrado: {opponentName} ⚽
            </p>
          </div>
        )}

        {/* State 3: RACING SCREEN */}
        {gameState === 'RACING' && (
          <div className="space-y-6">
            
            {/* Players Vs Bar */}
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                  TÚ
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">Tú (Corredor Azul)</span>
                  <span className="text-[10px] font-mono text-amber-400">{Math.round(playerPos)}% Recorrido</span>
                </div>
              </div>

              <div className="font-display font-black text-xs px-3 py-1 bg-cyan-950 text-cyan-400 rounded-full border border-cyan-800">
                POZO: {wager * 2} PTS
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="font-bold text-xs text-white block">{opponentName}</span>
                  <span className="text-[10px] font-mono text-rose-400">{Math.round(opponentPos)}% Recorrido</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow">
                  VS
                </div>
              </div>
            </div>

            {/* 3D Water Slide Track Canvas Simulation */}
            <div className="relative w-full h-80 rounded-3xl bg-gradient-to-b from-sky-400 via-cyan-600 to-blue-900 border-4 border-cyan-300 shadow-2xl overflow-hidden">
              
              {/* Water Wave Animations */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:24px_24px] opacity-30 animate-pulse" />

              {/* Water Slide Tube Borders */}
              <div className="absolute inset-y-0 left-4 w-4 bg-white/40 rounded-full blur-xs" />
              <div className="absolute inset-y-0 right-4 w-4 bg-white/40 rounded-full blur-xs" />

              {/* Finish Line Flag */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full border-2 border-white shadow-xl z-20">
                🏁 META ACUÁTICA 🏁
              </div>

              {/* Opponent Slider (Red) */}
              <div
                style={{
                  bottom: `${10 + opponentPos * 0.75}%`,
                  left: `${50 + opponentLane * 30}%`
                }}
                className="absolute -translate-x-1/2 transition-all duration-300 z-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
                  🔴 {opponentName.substring(0, 3)}
                </div>
              </div>

              {/* Player Slider (Blue / Gold) */}
              <div
                style={{
                  bottom: `${10 + playerPos * 0.75}%`,
                  left: `${50 + playerLane * 30}%`
                }}
                className="absolute -translate-x-1/2 transition-all duration-150 z-20"
              >
                <div className={`w-14 h-14 rounded-2xl border-2 border-white shadow-2xl flex items-center justify-center text-white font-black text-sm ${
                  turboActive ? 'bg-amber-400 text-slate-950 animate-bounce scale-125 shadow-amber-500/50' : 'bg-cyan-500'
                }`}>
                  🏄‍♂️ TÚ
                </div>
              </div>

            </div>

            {/* Steering & Turbo Controls */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleSteer(-1)}
                className="py-4 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-2xl border border-slate-800 flex items-center justify-center gap-2 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-400" />
                <span>IZQUIERDA</span>
              </button>

              <button
                onClick={handleTurbo}
                disabled={turboActive}
                className="py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-5 h-5 fill-slate-950 animate-bounce" />
                <span>TURBO SALTO</span>
              </button>

              <button
                onClick={() => handleSteer(1)}
                className="py-4 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-2xl border border-slate-800 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>DERECHA</span>
                <ArrowRight className="w-5 h-5 text-cyan-400" />
              </button>
            </div>

          </div>
        )}

        {/* State 4: RESULT SCREEN */}
        {gameState === 'RESULT' && (
          <div className="text-center py-12 space-y-6 animate-in fade-in zoom-in-95">
            {raceWinner === 'PLAYER' ? (
              <div className="space-y-3">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-2xl">
                  <Trophy className="w-10 h-10" />
                </div>
                <h2 className="font-display font-black text-3xl text-amber-400">
                  ¡1er LUGAR EN AQUAPARK!
                </h2>
                <p className="text-xs text-slate-300">
                  Superaste a {opponentName} en el tobogán acuático.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-base shadow-xl">
                  <Coins className="w-6 h-6" />
                  <span>+{wager * 2} Puntos Ganados</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-20 h-20 rounded-3xl bg-rose-500/20 border-2 border-rose-400 text-rose-400 flex items-center justify-center mx-auto shadow-2xl">
                  <Award className="w-10 h-10" />
                </div>
                <h2 className="font-display font-black text-3xl text-rose-400">
                  2do LUGAR ({opponentName} Ganó)
                </h2>
                <p className="text-xs text-slate-300">
                  Has perdido {wager} puntos en esta carrera. ¡Inténtalo de nuevo!
                </p>
              </div>
            )}

            <button
              onClick={() => setGameState('IDLE')}
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>JUGAR OTRA CARRERA</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
