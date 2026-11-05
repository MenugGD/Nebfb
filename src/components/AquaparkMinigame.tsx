import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Coins,
  RefreshCw,
  Zap,
  ArrowLeft,
  ArrowRight,
  Award,
  UserCheck,
  Loader2,
  Shield,
  HelpCircle,
  AlertTriangle,
  Flame
} from 'lucide-react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

interface AquaparkMinigameProps {
  onEarnPoints: (points: number) => Promise<void>;
  userPoints: number;
  currentUser: User;
}

const TOTAL_TRACK_METERS = 3000;

interface MathQuestion {
  num1: number;
  num2: number;
  operator: '+' | '-';
  correctAnswer: number;
  options: number[];
}

export const AquaparkMinigame: React.FC<AquaparkMinigameProps> = ({ onEarnPoints, userPoints, currentUser }) => {
  const [wager, setWager] = useState<number>(100);
  const [gameState, setGameState] = useState<'IDLE' | 'MATCHMAKING' | 'RACING' | 'RESULT'>('IDLE');
  
  // Real-time online match state
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(true);
  const [opponentName, setOpponentName] = useState<string>('Buscando jugador real...');
  
  // Race state (0 to 3000 meters)
  const [playerMeters, setPlayerMeters] = useState<number>(0);
  const [opponentMeters, setOpponentMeters] = useState<number>(0);
  const [playerLane, setPlayerLane] = useState<number>(0); // -1: Left, 0: Center, 1: Right
  const [opponentLane, setOpponentLane] = useState<number>(0);
  
  // Power-Ups & Penalties
  const [turboActive, setTurboActive] = useState<boolean>(false);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [hasMathPowerUp, setHasMathPowerUp] = useState<boolean>(false);
  const [playerFrozenTime, setPlayerFrozenTime] = useState<number>(0);
  const [opponentFrozenTime, setOpponentFrozenTime] = useState<number>(0);
  const [raceWinner, setRaceWinner] = useState<'PLAYER' | 'OPPONENT' | null>(null);

  // Math Challenge Popup Modal State
  const [activeMathModal, setActiveMathModal] = useState<boolean>(false);
  const [mathQuestion, setMathQuestion] = useState<MathQuestion | null>(null);
  const [mathTimer, setMathTimer] = useState<number>(5);

  // Track obstacles generator (whirlpools, oil, powerups)
  const [trackEvents, setTrackEvents] = useState<Array<{ id: number; lane: number; dist: number; type: 'WHIRLPOOL' | 'OIL' | 'TURBO' | 'SHIELD' | 'MATH' }>>([]);

  // Generate track obstacles when race starts
  const generateTrackEvents = () => {
    const events = [];
    let idCounter = 1;
    for (let dist = 300; dist < TOTAL_TRACK_METERS - 200; dist += 250) {
      const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      const rand = Math.random();
      let type: 'WHIRLPOOL' | 'OIL' | 'TURBO' | 'SHIELD' | 'MATH' = 'WHIRLPOOL';
      if (rand < 0.25) type = 'WHIRLPOOL';
      else if (rand < 0.45) type = 'OIL';
      else if (rand < 0.65) type = 'TURBO';
      else if (rand < 0.82) type = 'SHIELD';
      else type = 'MATH';

      events.push({ id: idCounter++, lane, dist, type });
    }
    setTrackEvents(events);
  };

  const generateRandomMathQuestion = (): MathQuestion => {
    const isAdd = Math.random() > 0.4;
    const num1 = Math.floor(Math.random() * 30) + 10;
    const num2 = Math.floor(Math.random() * 25) + 5;
    const correctAnswer = isAdd ? num1 + num2 : num1 - num2;
    
    // 3 wrong answers
    const optionsSet = new Set<number>([correctAnswer]);
    while (optionsSet.size < 4) {
      const delta = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const fake = correctAnswer + delta;
      if (fake >= 0 && fake !== correctAnswer) optionsSet.add(fake);
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);
    return { num1, num2, operator: isAdd ? '+' : '-', correctAnswer, options };
  };

  const triggerMathChallengePopup = () => {
    setMathQuestion(generateRandomMathQuestion());
    setMathTimer(5);
    setActiveMathModal(true);
    sounds.playPackTear();
  };

  // Math challenge countdown
  useEffect(() => {
    if (!activeMathModal) return;
    if (mathTimer <= 0) {
      // Failed math timer! Freeze player
      setActiveMathModal(false);
      setPlayerFrozenTime(3);
      sounds.playPackTear();
      return;
    }

    const timer = setTimeout(() => {
      setMathTimer(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeMathModal, mathTimer]);

  const handleAnswerMathQuestion = (answer: number) => {
    if (!mathQuestion) return;
    if (answer === mathQuestion.correctAnswer) {
      // Correct! Boost player forward 250m!
      sounds.playCoin();
      setPlayerMeters(prev => Math.min(TOTAL_TRACK_METERS, prev + 250));
      setTurboActive(true);
      setTimeout(() => setTurboActive(false), 2000);
      confetti({ particleCount: 30, spread: 60 });
    } else {
      // Wrong answer! Freeze 2.5s
      sounds.playPackTear();
      setPlayerFrozenTime(2.5);
    }
    setActiveMathModal(false);
  };

  // Start Matchmaking
  const handleStartMatchmaking = async () => {
    if (userPoints < wager) {
      alert(`Necesitas al menos ${wager} puntos para apostar.`);
      return;
    }

    setGameState('MATCHMAKING');
    setPlayerMeters(0);
    setOpponentMeters(0);
    setPlayerLane(0);
    setHasShield(false);
    setHasMathPowerUp(false);
    setPlayerFrozenTime(0);
    setOpponentFrozenTime(0);
    setRaceWinner(null);
    setOpponentName('Buscando jugador real en línea...');
    generateTrackEvents();

    try {
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
    } catch {
      setMatchId(`local_${Date.now()}`);
      setIsHost(true);
      setOpponentName('Rival Pro');
      setGameState('RACING');
    }
  };

  // Online Realtime Match Sync
  useEffect(() => {
    if (!matchId || matchId.startsWith('local_')) return;

    const unsub = onSnapshot(doc(db, 'raceMatches', matchId), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      if (isHost && data.status === 'racing' && gameState === 'MATCHMAKING') {
        setOpponentName(data.guestUsername || 'Jugador Real');
        setGameState('RACING');
        sounds.playCoin();
      }

      if (isHost) {
        if (typeof data.guestPos === 'number') setOpponentMeters(data.guestPos * (TOTAL_TRACK_METERS / 100));
      } else {
        if (typeof data.hostPos === 'number') setOpponentMeters(data.hostPos * (TOTAL_TRACK_METERS / 100));
      }

      if (data.status === 'finished' && data.winnerUid && gameState === 'RACING') {
        const iWon = data.winnerUid === currentUser.username;
        finishRace(iWon ? 'PLAYER' : 'OPPONENT');
      }
    }, () => {});

    return () => unsub();
  }, [matchId, isHost, gameState, currentUser.username]);

  // Movement & Collision Loop
  useEffect(() => {
    if (gameState !== 'RACING') return;

    const interval = setInterval(() => {
      // 1. Update Player Frozen Timer
      if (playerFrozenTime > 0) {
        setPlayerFrozenTime(prev => Math.max(0, prev - 0.1));
      }

      // 2. Update Player Position if not frozen
      if (playerFrozenTime <= 0) {
        setPlayerMeters(prevM => {
          const speedMultiplier = turboActive ? 2.5 : 1.3;
          const deltaMeters = (15 + Math.random() * 8) * speedMultiplier;
          const nextM = Math.min(TOTAL_TRACK_METERS, prevM + deltaMeters);

          // Check collisions with track obstacles
          trackEvents.forEach(evt => {
            if (evt.lane === playerLane && Math.abs(evt.dist - nextM) < 25) {
              if (evt.type === 'WHIRLPOOL' || evt.type === 'OIL') {
                if (hasShield) {
                  setHasShield(false);
                  sounds.playCoin();
                } else {
                  setPlayerFrozenTime(1.8);
                  sounds.playPackTear();
                }
              } else if (evt.type === 'TURBO') {
                setTurboActive(true);
                sounds.playCoin();
                setTimeout(() => setTurboActive(false), 2000);
              } else if (evt.type === 'SHIELD') {
                setHasShield(true);
                sounds.playCoin();
              } else if (evt.type === 'MATH') {
                setHasMathPowerUp(true);
                sounds.playCoin();
              }
            }
          });

          // Sync to Firestore
          if (matchId && !matchId.startsWith('local_')) {
            const matchRef = doc(db, 'raceMatches', matchId);
            const percent = (nextM / TOTAL_TRACK_METERS) * 100;
            const updateField = isHost ? { hostPos: percent } : { guestPos: percent };
            updateDoc(matchRef, updateField).catch(() => {});
          }

          return nextM;
        });
      }

      // 3. Opponent Movement (local mode fallback or bot)
      if (matchId?.startsWith('local_')) {
        if (opponentFrozenTime > 0) {
          setOpponentFrozenTime(prev => Math.max(0, prev - 0.1));
        } else {
          setOpponentMeters(prevO => {
            const botDelta = 16 + Math.random() * 9;
            return Math.min(TOTAL_TRACK_METERS, prevO + botDelta);
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, turboActive, playerFrozenTime, opponentFrozenTime, playerLane, hasShield, trackEvents, matchId, isHost]);

  // Check Winner
  useEffect(() => {
    if (gameState !== 'RACING') return;

    if (playerMeters >= TOTAL_TRACK_METERS) {
      finishRace('PLAYER');
    } else if (opponentMeters >= TOTAL_TRACK_METERS) {
      finishRace('OPPONENT');
    }
  }, [playerMeters, opponentMeters, gameState]);

  const finishRace = async (winner: 'PLAYER' | 'OPPONENT') => {
    if (gameState === 'RESULT') return;
    setGameState('RESULT');
    setRaceWinner(winner);

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
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 } });
      await onEarnPoints(wager * 2);
    } else {
      sounds.playPackTear();
      await onEarnPoints(-wager);
    }
  };

  const handleLaunchMathAttackAtOpponent = () => {
    if (!hasMathPowerUp) return;
    setHasMathPowerUp(false);
    sounds.playCoin();

    // Random chance 50%: If rival hits us back, pop up math quiz; else freeze rival!
    if (Math.random() > 0.4) {
      setOpponentFrozenTime(3);
    } else {
      triggerMathChallengePopup();
    }
  };

  const handleTurbo = () => {
    if (turboActive) return;
    setTurboActive(true);
    sounds.playCoin();
    setTimeout(() => setTurboActive(false), 2000);
  };

  const handleSteer = (dir: -1 | 1) => {
    setPlayerLane(prev => Math.max(-1, Math.min(1, prev + dir)));
    sounds.playStickerSlap();
  };

  const playerPercent = Math.min(100, Math.round((playerMeters / TOTAL_TRACK_METERS) * 100));
  const opponentPercent = Math.min(100, Math.round((opponentMeters / TOTAL_TRACK_METERS) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-cyan-500/40 p-5 sm:p-6 rounded-3xl shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>Aquapark Tobogán Gigante 3000M 1v1</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            Carrera Tobogán con Obstáculos y Reto Matemático
          </h1>
          <p className="text-xs text-slate-300">
            Esquiva remolinos 🌀 y aceite 🛢️, recoge Turbos 🚀 y ataca a tu rival con Retos Matemáticos 🧮.
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

      {/* Main Game Card Container */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-4 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* IDLE state */}
        {gameState === 'IDLE' && (
          <div className="text-center py-8 space-y-6 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center mx-auto shadow-2xl animate-bounce">
              <span className="text-4xl">🏄‍♂️</span>
            </div>

            <div>
              <h3 className="font-display font-black text-2xl text-white">Selecciona tu Apuesta 1v1</h3>
              <p className="text-xs text-slate-400 mt-1">
                Recorrido de 3,000 metros con Turbos, Escudos y Ataques Matemáticos para frenar al rival.
              </p>
            </div>

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
              <span>ENTRAR AL TOBOGÁN MUNDIAL ({wager} pts)</span>
            </button>
          </div>
        )}

        {/* MATCHMAKING state */}
        {gameState === 'MATCHMAKING' && (
          <div className="text-center py-16 space-y-6 max-w-md mx-auto">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
              <Loader2 className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xl text-white">
                Conectando al Tobogán 1v1...
              </h3>
              <p className="text-xs text-cyan-300 font-mono animate-pulse">
                Buscando usuario real en línea para la sala de {wager} pts...
              </p>
            </div>

            <button
              onClick={() => {
                setGameState('IDLE');
                setMatchId(null);
              }}
              className="px-6 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl transition-all"
            >
              Cancelar Búsqueda
            </button>
          </div>
        )}

        {/* RACING STATE */}
        {gameState === 'RACING' && (
          <div className="space-y-5">
            
            {/* Top Scorebar Header */}
            <div className="flex items-center justify-between bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow">
                  TÚ
                </div>
                <div>
                  <span className="font-bold text-xs text-white block truncate max-w-[100px] sm:max-w-none">{currentUser.username}</span>
                  <span className="text-[10px] font-mono text-amber-400">{Math.round(playerMeters)}m / 3000m ({playerPercent}%)</span>
                </div>
              </div>

              <div className="font-display font-black text-xs px-2.5 py-1 bg-cyan-950 text-cyan-400 rounded-full border border-cyan-800">
                POZO: {wager * 2} PTS
              </div>

              <div className="flex items-center gap-2 sm:gap-3 text-right">
                <div>
                  <span className="font-bold text-xs text-white block truncate max-w-[100px] sm:max-w-none">{opponentName}</span>
                  <span className="text-[10px] font-mono text-rose-400">{Math.round(opponentMeters)}m / 3000m ({opponentPercent}%)</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white font-black flex items-center justify-center text-xs shadow">
                  VS
                </div>
              </div>
            </div>

            {/* Track Status Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {hasShield && (
                  <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold flex items-center gap-1 animate-pulse">
                    <Shield className="w-3.5 h-3.5" /> ESCUDO ACTIVO
                  </span>
                )}
                {hasMathPowerUp && (
                  <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-xl font-bold flex items-center gap-1 animate-bounce">
                    <HelpCircle className="w-3.5 h-3.5" /> ¡RETO MATEMÁTICO LISTO!
                  </span>
                )}
                {playerFrozenTime > 0 && (
                  <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl font-bold flex items-center gap-1 animate-ping">
                    <AlertTriangle className="w-3.5 h-3.5" /> ¡FRENADO POR OBSTÁCULO! ({playerFrozenTime.toFixed(1)}s)
                  </span>
                )}
              </div>

              <div className="text-[11px] text-cyan-300 font-mono">
                Longitud del Tobogán: 3,000 Metros
              </div>
            </div>

            {/* 3D Water Slide Track Simulation Container */}
            <div className="relative w-full h-80 sm:h-96 rounded-3xl bg-gradient-to-b from-sky-400 via-cyan-600 to-blue-950 border-4 border-cyan-300 shadow-2xl overflow-hidden touch-none select-none">
              
              {/* Animated Water Mesh */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:28px_28px] opacity-35 animate-pulse" />

              {/* Lane Dividers */}
              <div className="absolute inset-y-0 left-1/3 w-0.5 bg-white/20 border-r border-dashed border-white/30" />
              <div className="absolute inset-y-0 right-1/3 w-0.5 bg-white/20 border-r border-dashed border-white/30" />

              {/* Water Slide Tube Glow Borders */}
              <div className="absolute inset-y-0 left-2 w-4 bg-white/50 rounded-full blur-xs" />
              <div className="absolute inset-y-0 right-2 w-4 bg-white/50 rounded-full blur-xs" />

              {/* Finish Line Flag */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-amber-400 text-slate-950 font-black text-xs rounded-full border-2 border-white shadow-2xl z-20 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                <span>🏁 META 3,000 METROS 🏁</span>
              </div>

              {/* Render Obstacles & Power-Ups along the visible track viewport */}
              {trackEvents.map(evt => {
                const relativeDist = evt.dist - playerMeters;
                // Render if within 500m ahead of player
                if (relativeDist > -50 && relativeDist < 500) {
                  const topPercent = Math.max(10, Math.min(85, 90 - (relativeDist / 500) * 75));
                  const leftPos = evt.lane === -1 ? '20%' : evt.lane === 0 ? '50%' : '80%';
                  return (
                    <div
                      key={evt.id}
                      style={{ top: `${topPercent}%`, left: leftPos }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300"
                    >
                      {evt.type === 'WHIRLPOOL' && (
                        <div className="w-10 h-10 rounded-full bg-cyan-400/80 border-2 border-white flex items-center justify-center text-lg animate-spin shadow-lg">
                          🌀
                        </div>
                      )}
                      {evt.type === 'OIL' && (
                        <div className="w-10 h-10 rounded-full bg-slate-950 border-2 border-rose-500 flex items-center justify-center text-lg shadow-lg">
                          🛢️
                        </div>
                      )}
                      {evt.type === 'TURBO' && (
                        <div className="w-10 h-10 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-lg shadow-lg animate-bounce">
                          🚀
                        </div>
                      )}
                      {evt.type === 'SHIELD' && (
                        <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-lg">
                          <Shield className="w-5 h-5" />
                        </div>
                      )}
                      {evt.type === 'MATH' && (
                        <div className="w-10 h-10 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white shadow-lg animate-pulse">
                          🧮
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}

              {/* Opponent Slider */}
              <div
                style={{
                  bottom: `${10 + (opponentMeters / TOTAL_TRACK_METERS) * 75}%`,
                  left: opponentLane === -1 ? '20%' : opponentLane === 0 ? '50%' : '80%'
                }}
                className="absolute -translate-x-1/2 transition-all duration-300 z-10"
              >
                <div className={`w-12 h-12 rounded-2xl bg-rose-600 border-2 border-white shadow-xl flex flex-col items-center justify-center text-white font-bold text-[10px] ${
                  opponentFrozenTime > 0 ? 'animate-spin opacity-60' : ''
                }`}>
                  <span>🔴 RIVAL</span>
                  <span className="font-mono text-[9px]">{Math.round(opponentMeters)}m</span>
                </div>
              </div>

              {/* Player Slider (Blue / Gold) */}
              <div
                style={{
                  bottom: `${10 + (playerMeters / TOTAL_TRACK_METERS) * 75}%`,
                  left: playerLane === -1 ? '20%' : playerLane === 0 ? '50%' : '80%'
                }}
                className="absolute -translate-x-1/2 transition-all duration-150 z-20"
              >
                <div className={`w-14 h-14 rounded-2xl border-2 border-white shadow-2xl flex flex-col items-center justify-center text-white font-black text-xs ${
                  turboActive
                    ? 'bg-amber-400 text-slate-950 animate-bounce scale-125 shadow-amber-500/50'
                    : playerFrozenTime > 0
                    ? 'bg-rose-950 border-rose-500 animate-spin opacity-80'
                    : 'bg-cyan-500'
                }`}>
                  <span>🏄‍♂️ TÚ</span>
                  <span className="font-mono text-[9px]">{Math.round(playerMeters)}m</span>
                </div>
              </div>

            </div>

            {/* Mobile Touch Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSteer(-1)}
                className="py-4 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-2xl border border-slate-800 flex items-center justify-center gap-2 active:scale-95 shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-400" />
                <span>IZQUIERDA</span>
              </button>

              <button
                type="button"
                onClick={() => handleSteer(1)}
                className="py-4 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-2xl border border-slate-800 flex items-center justify-center gap-2 active:scale-95 shadow-lg"
              >
                <span>DERECHA</span>
                <ArrowRight className="w-5 h-5 text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={handleTurbo}
                disabled={turboActive}
                className="py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-5 h-5 fill-slate-950" />
                <span>TURBO SALTO</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchMathAttackAtOpponent}
                disabled={!hasMathPowerUp}
                className={`py-4 font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  hasMathPowerUp
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white animate-bounce ring-2 ring-purple-400'
                    : 'bg-slate-950 text-slate-600 border border-slate-800 opacity-60'
                }`}
              >
                <HelpCircle className="w-5 h-5 text-purple-300" />
                <span>RETO MATEMÁTICO</span>
              </button>
            </div>

          </div>
        )}

        {/* RESULT STATE */}
        {gameState === 'RESULT' && (
          <div className="text-center py-12 space-y-6 animate-in fade-in zoom-in-95">
            {raceWinner === 'PLAYER' ? (
              <div className="space-y-3">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-2xl">
                  <Trophy className="w-10 h-10" />
                </div>
                <h2 className="font-display font-black text-3xl text-amber-400">
                  ¡CAMPEÓN DEL TOBOGÁN 3000M!
                </h2>
                <p className="text-xs text-slate-300">
                  Superaste los 3,000 metros y derrotaste a {opponentName}.
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
                  {opponentName} llegó primero a los 3,000 metros. Has perdido {wager} puntos.
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
              <span>JUGAR OTRA CARRERA (3000M)</span>
            </button>
          </div>
        )}

      </div>

      {/* MATH CHALLENGE ATTACK POPUP MODAL */}
      {activeMathModal && mathQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/80 rounded-3xl w-full max-w-md p-6 space-y-5 text-center shadow-2xl relative animate-in zoom-in-95">
            
            <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <HelpCircle className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>¡DESAFÍO MATEMÁTICO EN EL TOBOGÁN!</span>
              </div>
              <h3 className="font-display font-black text-2xl text-white">
                ¿Cuánto es {mathQuestion.num1} {mathQuestion.operator} {mathQuestion.num2}?
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                ¡Responde antes de {mathTimer}s o perderás velocidad!
              </p>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-2 gap-3">
              {mathQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerMathQuestion(option)}
                  className="py-3.5 bg-slate-950 hover:bg-purple-600 hover:text-white border border-slate-800 text-amber-400 font-mono font-black text-lg rounded-2xl transition-all shadow active:scale-95"
                >
                  {option}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
