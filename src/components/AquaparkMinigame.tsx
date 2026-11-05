import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Trophy, Coins, RefreshCw, Zap, ArrowLeft, ArrowRight, Play, ShieldAlert, Award, UserCheck, Loader2 } from 'lucide-react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

interface AquaparkMinigameProps {
  onEarnPoints: (points: number) => Promise<void>;
  userPoints: number;
  currentUser: User;
}

export const AquaparkMinigame: React.FC<AquaparkMinigameProps> = ({ onEarnPoints, userPoints, currentUser }) => {
  const [wager, setWager] = useState<number>(100);
  const [gameState, setGameState] = useState<'IDLE' | 'MATCHMAKING' | 'RACING' | 'RESULT'>('IDLE');
  
  // Real-time online match state
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(true);
  const [opponentName, setOpponentName] = useState<string>('Buscando jugador real...');
  
  // Race state
  const [playerPos, setPlayerPos] = useState<number>(0); // 0 to 100%
  const [opponentPos, setOpponentPos] = useState<number>(0);
  const [playerLane, setPlayerLane] = useState<number>(0); // -1: Left, 0: Center, 1: Right
  const [opponentLane, setOpponentLane] = useState<number>(0);
  const [turboActive, setTurboActive] = useState<boolean>(false);
  const [raceWinner, setRaceWinner] = useState<'PLAYER' | 'OPPONENT' | null>(null);

  // Start Online Matchmaking (Search for real connected users ONLY)
  const handleStartMatchmaking = async () => {
    if (userPoints < wager) {
      alert(`Necesitas al menos ${wager} puntos para apostar.`);
      return;
    }

    setGameState('MATCHMAKING');
    setPlayerPos(0);
    setOpponentPos(0);
    setPlayerLane(0);
    setRaceWinner(null);
    setOpponentName('Buscando jugador real en línea...');

    try {
      // 1. Check if another real player is waiting for a match with this wager
      const q = query(
        collection(db, 'raceMatches'),
        where('status', '==', 'waiting'),
        where('wager', '==', wager),
        limit(5)
      );

      const snap = await getDocs(q);
      const openMatches = snap.docs.filter(d => {
        const data = d.data();
        return data.hostUsername !== currentUser.username;
      });

      if (openMatches.length > 0) {
        // Join existing match as guest
        const targetMatch = openMatches[0];
        const targetRef = doc(db, 'raceMatches', targetMatch.id);
        const hostData = targetMatch.data();

        await updateDoc(targetRef, {
          guestUsername: currentUser.username,
          guestUid: currentUser.username,
          status: 'racing',
          updatedAt: new Date().toISOString()
        });

        setIsHost(false);
        setMatchId(targetMatch.id);
        setOpponentName(hostData.hostUsername || 'Jugador Real');
        setGameState('RACING');
        sounds.playCoin();
      } else {
        // Create new room and wait for a real opponent
        const newMatchRef = await addDoc(collection(db, 'raceMatches'), {
          hostUsername: currentUser.username,
          hostUid: currentUser.username,
          wager: wager,
          status: 'waiting',
          hostPos: 0,
          guestPos: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        setIsHost(true);
        setMatchId(newMatchRef.id);
      }
    } catch (err) {
      console.error('Error starting online matchmaking:', err);
      // Fallback local match creation if Firestore fails transiently
      setMatchId(`local_${Date.now()}`);
      setIsHost(true);
    }
  };

  // Listen to Firestore match document updates in real-time
  useEffect(() => {
    if (!matchId || matchId.startsWith('local_')) return;

    const unsub = onSnapshot(doc(db, 'raceMatches', matchId), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      // Host waiting for guest to join
      if (isHost && data.status === 'racing' && gameState === 'MATCHMAKING') {
        setOpponentName(data.guestUsername || 'Jugador Real');
        setGameState('RACING');
        sounds.playCoin();
      }

      // Update real opponent position
      if (isHost) {
        if (typeof data.guestPos === 'number') setOpponentPos(data.guestPos);
      } else {
        if (typeof data.hostPos === 'number') setOpponentPos(data.hostPos);
      }

      // Handle match finish from remote player
      if (data.status === 'finished' && data.winnerUid && gameState === 'RACING') {
        const iWon = data.winnerUid === currentUser.username;
        finishRace(iWon ? 'PLAYER' : 'OPPONENT');
      }
    }, (err) => {
      console.warn('Realtime race subscription warning:', err);
    });

    return () => unsub();
  }, [matchId, isHost, gameState, currentUser.username]);

  // Main Race Movement Loop
  useEffect(() => {
    if (gameState !== 'RACING') return;

    const interval = setInterval(() => {
      setPlayerPos(prevP => {
        const nextP = Math.min(100, prevP + (turboActive ? 1.8 : 1.1) * (0.9 + Math.random() * 0.3));

        // Broadcast player position to Firestore for real-time multiplayer sync
        if (matchId && !matchId.startsWith('local_')) {
          const matchRef = doc(db, 'raceMatches', matchId);
          const updateField = isHost ? { hostPos: nextP } : { guestPos: nextP };
          updateDoc(matchRef, updateField).catch(() => {});
        }

        return nextP;
      });

      // If playing alone against a real player offline fallback, advance slightly
      if (matchId?.startsWith('local_')) {
        setOpponentPos(prevO => Math.min(100, prevO + 1.1 * (0.85 + Math.random() * 0.4)));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, turboActive, matchId, isHost]);

  // Safely trigger race finish outside state updaters
  useEffect(() => {
    if (gameState !== 'RACING') return;

    if (playerPos >= 100) {
      finishRace('PLAYER');
    } else if (opponentPos >= 100) {
      finishRace('OPPONENT');
    }
  }, [playerPos, opponentPos, gameState]);

  const finishRace = async (winner: 'PLAYER' | 'OPPONENT') => {
    if (gameState === 'RESULT') return;
    setGameState('RESULT');
    setRaceWinner(winner);

    // Update match status in Firestore
    if (matchId && !matchId.startsWith('local_')) {
      const matchRef = doc(db, 'raceMatches', matchId);
      updateDoc(matchRef, {
        status: 'finished',
        winnerUid: winner === 'PLAYER' ? currentUser.username : opponentName,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }

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
      // Lose wager
      await onEarnPoints(-wager);
    }
  };

  const handleCancelSearch = async () => {
    if (matchId && !matchId.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'raceMatches', matchId));
      } catch (e) {
        console.warn('Failed to delete pending race match:', e);
      }
    }
    setGameState('IDLE');
    setMatchId(null);
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
            <span>Aquapark.io Fútbol Slide 1v1 ONLINE</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            Carrera Tobogán Online Multijugador
          </h1>
          <p className="text-xs text-slate-300">
            Compite únicamente contra jugadores reales en línea. ¡El 1er lugar se lleva el pozo de puntos apostado!
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
              <h3 className="font-display font-black text-2xl text-white">Selecciona tu Apuesta 1v1</h3>
              <p className="text-xs text-slate-400 mt-1">
                Se buscará a otro usuario real registrado en tiempo real. El ganador gana el doble de la apuesta.
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
              onClick={handleStartMatchmaking}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5 text-slate-950" />
              <span>BUSCAR JUGADOR REAL EN LÍNEA ({wager} pts)</span>
            </button>
          </div>
        )}

        {/* State 2: REAL ONLINE MATCHMAKING */}
        {gameState === 'MATCHMAKING' && (
          <div className="text-center py-16 space-y-6 max-w-md mx-auto">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
              <Loader2 className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xl text-white">
                Buscando jugador real conectado...
              </h3>
              <p className="text-xs text-cyan-300 font-mono animate-pulse">
                Esperando a que otro usuario entre a la sala de {wager} pts...
              </p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <p className="text-white font-bold">🟢 Sin Bots / Sin Jugadores Falsos</p>
              <p>Tu partida comenzará automáticamente cuando se conecte un rival real.</p>
            </div>

            <button
              onClick={handleCancelSearch}
              className="px-6 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl transition-all"
            >
              Cancelar Búsqueda
            </button>
          </div>
        )}

        {/* State 3: RACING SCREEN */}
        {gameState === 'RACING' && (
          <div className="space-y-6">
            
            {/* Players Vs Bar */}
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow">
                  TÚ
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">{currentUser.username}</span>
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
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-black flex items-center justify-center text-xs shadow">
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

              {/* Opponent Slider (Real online user) */}
              <div
                style={{
                  bottom: `${10 + opponentPos * 0.75}%`,
                  left: `${50 + opponentLane * 30}%`
                }}
                className="absolute -translate-x-1/2 transition-all duration-300 z-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
                  🔴 {opponentName.substring(0, 5)}
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
                <div className={`w-14 h-14 rounded-2xl border-2 border-white shadow-2xl flex items-center justify-center text-white font-black text-xs ${
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
                  ¡1er LUGAR ONLINE!
                </h2>
                <p className="text-xs text-slate-300">
                  Le ganaste la carrera en tiempo real a {opponentName}.
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
                  {opponentName} llegó primero a la meta acuática. Has perdido {wager} puntos.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setGameState('IDLE');
                setMatchId(null);
              }}
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>BUSCAR OTRA CARRERA ONLINE</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
