import React, { useState } from 'react';
import { Sticker, User } from '../types';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Package, Sparkles, ShoppingBag, Coins, RefreshCw, CheckCircle2, Star, ArrowRight } from 'lucide-react';

interface PackOpenerProps {
  user: User | null;
  onOpenPack: () => Promise<Sticker[]>;
  onBuyPacks: (amount: number) => Promise<void>;
  onOpenAuth: () => void;
  onGoToAlbum: () => void;
}

const BOOSTER_PACK_IMG = '/src/assets/images/booster_pack_gold_1793815063418.jpg';

export const PackOpener: React.FC<PackOpenerProps> = ({
  user,
  onOpenPack,
  onBuyPacks,
  onOpenAuth,
  onGoToAlbum
}) => {
  const [opening, setOpening] = useState(false);
  const [isTorn, setIsTorn] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Sticker[] | null>(null);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [buying, setBuying] = useState(false);
  const [buySuccessMsg, setBuySuccessMsg] = useState<string | null>(null);

  const handleStartOpenPack = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (user.packsCount <= 0) {
      return;
    }

    setOpening(true);
    setIsTorn(false);
    setRevealedCards(null);
    setFlippedIndices([]);

    sounds.playPackTear();
    setTimeout(() => {
      setIsTorn(true);
    }, 400);

    try {
      const cards = await onOpenPack();
      setTimeout(() => {
        setRevealedCards(cards);
      }, 700);
    } catch (err: any) {
      setOpening(false);
      setIsTorn(false);
      setBuySuccessMsg(err?.message || 'Error al abrir sobre');
    }
  };

  const handleCardFlip = (index: number, sticker: Sticker) => {
    if (flippedIndices.includes(index)) return;

    sounds.playCardReveal(sticker.rarity === 'dorada_holo');
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (sticker.rarity === 'dorada_holo') {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });
    }

    if (newFlipped.length === 5) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
      }, 300);
    }
  };

  const handleBuy = async (amount: number) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setBuying(true);
    setBuySuccessMsg(null);
    try {
      await onBuyPacks(amount);
      sounds.playCoin();
      setBuySuccessMsg(`¡Has comprado ${amount} sobre(s) con éxito!`);
      setTimeout(() => setBuySuccessMsg(null), 3000);
    } catch {
      // Error handled in parent
    } finally {
      setBuying(false);
    }
  };

  const resetPackOpener = () => {
    setOpening(false);
    setIsTorn(false);
    setRevealedCards(null);
    setFlippedIndices([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
          <Package className="w-4 h-4" />
          <span>Tienda y Apertura de Sobres</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
          Abre tus Sobres de Cromos
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Cada sobre contiene 5 estampas aleatorias. ¡Descubre cromos dorados holográficos y completa tu álbum!
        </p>
      </div>

      {/* Main Pack Opening Zone */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {!revealedCards ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
            
            {/* Sealed Pack Illustration */}
            <div className="relative group cursor-pointer" onClick={handleStartOpenPack}>
              <div className="w-56 sm:w-64 h-80 sm:h-92 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300 relative">
                <img
                  src={BOOSTER_PACK_IMG}
                  alt="Sobre Dorado de Cromos"
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isTorn ? 'scale-110 rotate-2 filter brightness-125' : ''
                  }`}
                />
                
                {/* Holographic foil overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-yellow-300/30 pointer-events-none group-hover:opacity-80 transition-opacity" />
              </div>

              {user && user.packsCount > 0 && (
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black px-3 py-1 rounded-full text-xs shadow-lg animate-bounce">
                  {user.packsCount} Disponible(s)
                </div>
              )}
            </div>

            {/* Action button */}
            {user ? (
              user.packsCount > 0 ? (
                <button
                  onClick={handleStartOpenPack}
                  disabled={opening}
                  className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2"
                >
                  {opening ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Rompiendo sobre...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>¡ABRIR SOBRE DE CROMOS!</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-rose-400">
                    No tienes sobres en este momento. Compra más abajo con monedas o canjea un código.
                  </p>
                </div>
              )
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-6 py-3 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-amber-400 transition-colors"
              >
                Inicia sesión para abrir sobres
              </button>
            )}

          </div>
        ) : (
          /* Cards Revealed Sequence */
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-1">
              <h3 className="font-display font-extrabold text-2xl text-amber-400">
                ¡Has obtenido 5 Cromos!
              </h3>
              <p className="text-xs text-slate-300">
                Toca cada carta para darle la vuelta y ver a los jugadores
              </p>
            </div>

            {/* 5 Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {revealedCards.map((sticker, idx) => {
                const isFlipped = flippedIndices.includes(idx);
                const isHolo = sticker.rarity === 'dorada_holo';

                return (
                  <div
                    key={`${sticker.id}_${idx}`}
                    onClick={() => handleCardFlip(idx, sticker)}
                    className="relative h-64 cursor-pointer perspective-1000"
                  >
                    <div className={`w-full h-full duration-500 transition-all transform-style-3d ${
                      isFlipped ? 'rotate-y-180' : 'hover:scale-105'
                    }`}>
                      
                      {/* Card Back (Foil Envelope Pattern) */}
                      {!isFlipped ? (
                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-600 via-slate-900 to-amber-900 border-2 border-amber-400/80 p-4 flex flex-col items-center justify-center text-center shadow-xl">
                          <div className="w-12 h-12 rounded-full bg-slate-950/80 text-amber-400 flex items-center justify-center mb-3 shadow">
                            <Package className="w-6 h-6" />
                          </div>
                          <span className="font-display font-extrabold text-xs text-amber-200 uppercase tracking-widest">
                            PANINI 2026
                          </span>
                          <span className="text-[10px] text-amber-400/80 font-mono mt-1">Toca para voltear</span>
                        </div>
                      ) : (
                        /* Card Front (Sticker Revealed) */
                        <div className={`w-full h-full rounded-2xl p-3 flex flex-col justify-between border shadow-2xl ${
                          isHolo
                            ? 'bg-slate-900 border-amber-400 animate-holo'
                            : 'bg-slate-900 border-slate-700'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                              #{String(sticker.number).padStart(3, '0')}
                            </span>
                            {isHolo && (
                              <span className="text-[10px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase">
                                Holo
                              </span>
                            )}
                          </div>

                          <div className="w-full h-32 rounded-xl overflow-hidden my-2 border border-slate-800 shadow-inner">
                            <img
                              src={sticker.imageUrl}
                              alt={sticker.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div>
                            <h4 className="font-display font-bold text-xs text-white truncate">{sticker.name}</h4>
                            <p className="text-[11px] text-slate-400 flex justify-between mt-0.5">
                              <span>{sticker.team}</span>
                              <span className="text-amber-400 font-medium">{sticker.position}</span>
                            </p>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions after opening */}
            <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4">
              {user && user.packsCount > 0 ? (
                <button
                  onClick={resetPackOpener}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:from-amber-400 hover:to-yellow-400 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Abrir Otro Sobre ({user.packsCount} restantes)</span>
                </button>
              ) : null}

              <button
                onClick={onGoToAlbum}
                className="px-6 py-3 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <span>Ir al Álbum a Pegar Cromos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Store Section: Buy Packs with Coins */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-white">
                Tienda de Sobres Oficial
              </h3>
              <p className="text-xs text-slate-400">
                Compra paquetes de sobres con las monedas ganadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-amber-400 font-mono text-xs font-bold">
            <Coins className="w-4 h-4" />
            <span>{user?.coins || 0} Monedas</span>
          </div>
        </div>

        {buySuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{buySuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Pack 1 */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-amber-400 block">1 SOBRE DE CROMOS</span>
              <p className="text-[11px] text-slate-400 mt-1">5 cromos aleatorios</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-white flex items-center gap-1">
                <Coins className="w-4 h-4 text-amber-400" />
                100 Monedas
              </span>
              <button
                onClick={() => handleBuy(1)}
                disabled={buying || (user?.coins || 0) < 100}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors"
              >
                Comprar 1
              </button>
            </div>
          </div>

          {/* Pack 5 */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/40 relative flex flex-col justify-between space-y-4 shadow-lg shadow-amber-500/5">
            <div className="absolute -top-2.5 right-4 bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
              Más Popular
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 block">PACK 5 SOBRES</span>
              <p className="text-[11px] text-slate-400 mt-1">25 cromos + probabilidad alta de Holo</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-white flex items-center gap-1">
                <Coins className="w-4 h-4 text-amber-400" />
                500 Monedas
              </span>
              <button
                onClick={() => handleBuy(5)}
                disabled={buying || (user?.coins || 0) < 500}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow"
              >
                Comprar 5
              </button>
            </div>
          </div>

          {/* Pack 10 */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-amber-400 block">SUPER PACK 10 SOBRES</span>
              <p className="text-[11px] text-slate-400 mt-1">50 cromos para tu álbum</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-white flex items-center gap-1">
                <Coins className="w-4 h-4 text-amber-400" />
                1,000 Monedas
              </span>
              <button
                onClick={() => handleBuy(10)}
                disabled={buying || (user?.coins || 0) < 1000}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors"
              >
                Comprar 10
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
