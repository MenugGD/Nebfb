import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Sparkles, Coins, RefreshCw, Trophy, Play, RotateCcw } from 'lucide-react';

interface Match3MinigameProps {
  onEarnPoints: (points: number) => Promise<void>;
  userPoints: number;
}

type TileType = 'ball' | 'trophy' | 'gloves' | 'boots' | 'card';

const TILE_ICONS: Record<TileType, { icon: string; bg: string }> = {
  ball: { icon: '⚽', bg: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' },
  trophy: { icon: '🏆', bg: 'bg-amber-950/80 border-amber-500/40 text-amber-400' },
  gloves: { icon: '🧤', bg: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400' },
  boots: { icon: '👟', bg: 'bg-indigo-950/80 border-indigo-500/40 text-indigo-400' },
  card: { icon: '🟨', bg: 'bg-yellow-950/80 border-yellow-500/40 text-yellow-400' }
};

const BOARD_SIZE = 7;
const ALL_TYPES: TileType[] = ['ball', 'trophy', 'gloves', 'boots', 'card'];

export const Match3Minigame: React.FC<Match3MinigameProps> = ({ onEarnPoints, userPoints }) => {
  const [board, setBoard] = useState<TileType[][]>([]);
  const [selectedTile, setSelectedTile] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState<number>(0);
  const [movesLeft, setMovesLeft] = useState<number>(15);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [earnedPoints, setEarnedPoints] = useState<number>(0);

  // Generate initial board with no initial 3-matches
  const createBoard = (): TileType[][] => {
    const newBoard: TileType[][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const row: TileType[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        let type: TileType;
        do {
          type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
        } while (
          (c >= 2 && row[c - 1] === type && row[c - 2] === type) ||
          (r >= 2 && newBoard[r - 1][c] === type && newBoard[r - 2][c] === type)
        );
        row.push(type);
      }
      newBoard.push(row);
    }
    return newBoard;
  };

  const handleStartGame = () => {
    const freshBoard = createBoard();
    setBoard(freshBoard);
    setScore(0);
    setMovesLeft(15);
    setSelectedTile(null);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  const handleTileClick = (r: number, c: number) => {
    if (gameState !== 'PLAYING' || movesLeft <= 0) return;

    if (!selectedTile) {
      setSelectedTile({ r, c });
      sounds.playStickerSlap();
      return;
    }

    // If clicking same tile, unselect
    if (selectedTile.r === r && selectedTile.c === c) {
      setSelectedTile(null);
      return;
    }

    // Check if adjacent
    const isAdjacent =
      (Math.abs(selectedTile.r - r) === 1 && selectedTile.c === c) ||
      (Math.abs(selectedTile.c - c) === 1 && selectedTile.r === r);

    if (isAdjacent) {
      swapTiles(selectedTile.r, selectedTile.c, r, c);
    } else {
      setSelectedTile({ r, c });
      sounds.playStickerSlap();
    }
  };

  const swapTiles = (r1: number, c1: number, r2: number, c2: number) => {
    const newBoard = board.map(row => [...row]);
    const temp = newBoard[r1][c1];
    newBoard[r1][c1] = newBoard[r2][c2];
    newBoard[r2][c2] = temp;

    setBoard(newBoard);
    setSelectedTile(null);
    const nextMoves = movesLeft - 1;
    setMovesLeft(nextMoves);

    // Process Matches
    setTimeout(() => {
      const hasMatch = processMatches(newBoard, nextMoves);
      if (!hasMatch && nextMoves <= 0) {
        endGame(score);
      }
    }, 150);
  };

  const processMatches = (currentBoard: TileType[][], currentMoves: number): boolean => {
    const matchedPositions = new Set<string>();

    // Horizontal matches
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE - 2; c++) {
        const type = currentBoard[r][c];
        if (type && type === currentBoard[r][c + 1] && type === currentBoard[r][c + 2]) {
          matchedPositions.add(`${r},${c}`);
          matchedPositions.add(`${r},${c + 1}`);
          matchedPositions.add(`${r},${c + 2}`);
        }
      }
    }

    // Vertical matches
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE - 2; r++) {
        const type = currentBoard[r][c];
        if (type && type === currentBoard[r + 1][c] && type === currentBoard[r + 2][c]) {
          matchedPositions.add(`${r},${c}`);
          matchedPositions.add(`${r + 1},${c}`);
          matchedPositions.add(`${r + 2},${c}`);
        }
      }
    }

    if (matchedPositions.size > 0) {
      sounds.playCoin();
      const pointsGained = matchedPositions.size * 35;
      const newScore = score + pointsGained;
      setScore(newScore);

      // Cascade items down
      const nextBoard = currentBoard.map(row => [...row]);
      matchedPositions.forEach(pos => {
        const [r, c] = pos.split(',').map(Number);
        nextBoard[r][c] = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
      });

      setBoard(nextBoard);

      if (currentMoves <= 0) {
        setTimeout(() => endGame(newScore), 500);
      }
      return true;
    } else {
      if (currentMoves <= 0) {
        endGame(score);
      }
      return false;
    }
  };

  const endGame = async (finalScore: number) => {
    setGameState('GAMEOVER');
    const finalPoints = Math.round(finalScore * 0.6) + 60;
    setEarnedPoints(finalPoints);

    sounds.playFanfare();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    await onEarnPoints(finalPoints);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/30 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Fútbol Candy Crush Match-3</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            Combina Balones y Trofeos
          </h1>
          <p className="text-xs text-slate-300">
            Toca una ficha y luego una adyacente para intercambiarlas y alinear 3 o más iguales.
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

      {/* Game Card Container */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-4 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden max-w-xl mx-auto">
        
        {gameState === 'IDLE' && (
          <div className="text-center py-10 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-yellow-500/20 border-2 border-yellow-400 text-amber-400 flex items-center justify-center mx-auto shadow-2xl animate-pulse">
              <span className="text-4xl">⚽</span>
            </div>
            <div>
              <h3 className="font-display font-black text-2xl text-white">Desafío Match-3 de Fútbol</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Combina 3 balones, trofeos o botas en línea. Tienes 15 movimientos para lograr el máximo puntaje.
              </p>
            </div>
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>¡EMPEZAR PARTIDA MATCH-3!</span>
            </button>
          </div>
        )}

        {gameState === 'PLAYING' && (
          <div className="space-y-4">
            {/* HUD Status */}
            <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Puntaje:</span>
                <span className="font-mono font-black text-amber-400 text-lg">{score}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Movimientos:</span>
                <span className="font-mono font-black text-emerald-400 text-lg">{movesLeft}</span>
              </div>
            </div>

            {/* 7x7 Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-950 rounded-3xl border border-slate-800 shadow-inner">
              {board.map((row, r) =>
                row.map((tileType, c) => {
                  const isSelected = selectedTile?.r === r && selectedTile?.c === c;
                  const tileInfo = TILE_ICONS[tileType] || TILE_ICONS.ball;

                  return (
                    <button
                      key={`${r}_${c}`}
                      onClick={() => handleTileClick(r, c)}
                      className={`h-11 sm:h-14 rounded-xl sm:rounded-2xl border flex items-center justify-center text-xl sm:text-2xl transition-all select-none ${
                        tileInfo.bg
                      } ${
                        isSelected
                          ? 'border-amber-400 scale-110 shadow-lg shadow-amber-500/50 ring-2 ring-amber-400 bg-amber-500/20'
                          : 'hover:scale-105 active:scale-95'
                      }`}
                    >
                      {tileInfo.icon}
                    </button>
                  );
                })
              )}
            </div>

            <div className="text-center">
              <button
                onClick={handleStartGame}
                className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Tablero</span>
              </button>
            </div>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="text-center py-10 space-y-6 animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-2xl">
              <Trophy className="w-10 h-10" />
            </div>
            <h2 className="font-display font-black text-3xl text-amber-400">
              ¡PARTIDA FINALIZADA!
            </h2>
            <p className="text-xs text-slate-300">
              Lograste {score} puntos combinando elementos futbolísticos.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-base shadow-xl">
              <Coins className="w-6 h-6" />
              <span>+{earnedPoints} Puntos Reclamados</span>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>JUGAR OTRA VEZ</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
