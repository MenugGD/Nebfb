import React, { useState } from 'react';
import { Sticker, TradeOffer, User } from '../types';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { RefreshCw, Plus, ArrowRight, CheckCircle2, AlertCircle, X, Search, Filter, ShieldCheck } from 'lucide-react';

interface TradingMarketProps {
  user: User | null;
  stickers: Sticker[];
  trades: TradeOffer[];
  onCreateTrade: (offeredNum: number, requestedNum: number) => Promise<void>;
  onAcceptTrade: (tradeId: string) => Promise<void>;
  onCancelTrade: (tradeId: string) => Promise<void>;
  onOpenAuth: () => void;
  preSelectedOfferedNum?: number | null;
}

export const TradingMarket: React.FC<TradingMarketProps> = ({
  user,
  stickers,
  trades,
  onCreateTrade,
  onAcceptTrade,
  onCancelTrade,
  onOpenAuth,
  preSelectedOfferedNum
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOffered, setSelectedOffered] = useState<number>(preSelectedOfferedNum || 0);
  const [selectedRequested, setSelectedRequested] = useState<number>(1);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'canAccept'>('all');

  const stickersMap = new Map(stickers.map(s => [s.number, s]));
  const duplicatesMap = user?.duplicates || {};

  const userDuplicatesList = Object.entries(duplicatesMap)
    .map(([stNumStr, count]) => ({ number: Number(stNumStr), count: Number(count) }))
    .filter(d => d.count > 0 && stickersMap.has(d.number));

  const activeTrades = trades.filter(t => t.status === 'active');

  const filteredTrades = activeTrades.filter(t => {
    if (filterMode === 'my') {
      return user && t.creatorUsername.toLowerCase() === user.username.toLowerCase();
    }
    if (filterMode === 'canAccept') {
      if (!user) return false;
      const userHasRequested = (duplicatesMap[t.requestedStickerNumber] || 0) > 0;
      return userHasRequested && t.creatorUsername.toLowerCase() !== user.username.toLowerCase();
    }
    return true;
  });

  const handleOpenCreateModal = (offeredNum?: number) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (offeredNum) {
      setSelectedOffered(offeredNum);
    } else if (userDuplicatesList.length > 0) {
      setSelectedOffered(userDuplicatesList[0].number);
    }
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedOffered || !selectedRequested) {
      setErrorMsg('Selecciona el cromo que ofreces y el que pides.');
      return;
    }

    if (selectedOffered === selectedRequested) {
      setErrorMsg('No puedes ofrecer y pedir el mismo cromo.');
      return;
    }

    setLoadingAction('create');
    try {
      await onCreateTrade(selectedOffered, selectedRequested);
      sounds.playCoin();
      setSuccessMsg('¡Oferta de trueque publicada en el mercadito!');
      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la oferta');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAcceptClick = async (tradeId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setLoadingAction(tradeId);
    setErrorMsg(null);
    try {
      await onAcceptTrade(tradeId);
      sounds.playFanfare();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setSuccessMsg('¡Intercambio realizado con éxito! Los cromos han sido transferidos.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aceptar el trueque');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/30 p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <RefreshCw className="w-4 h-4" />
            <span>Mercadito de Intercambio en Línea</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Trueque de Cromos en Tiempo Real
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Pide los cromos que te faltan a otros coleccionistas y ofrece tus repetidas.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Oferta de Trueque</span>
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl text-xs text-emerald-300 font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl text-xs text-rose-300 font-bold flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterMode === 'all'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          Todas las Ofertas ({activeTrades.length})
        </button>

        <button
          onClick={() => setFilterMode('canAccept')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterMode === 'canAccept'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          Puedo Aceptar Ahora
        </button>

        <button
          onClick={() => setFilterMode('my')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterMode === 'my'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          Mis Publicaciones
        </button>
      </div>

      {/* Offers List */}
      {filteredTrades.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-slate-600 flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-white">No hay ofertas en esta categoría</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Sé el primero en publicar una oferta para que otros coleccionistas acepten el trueque.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTrades.map(trade => {
            const offeredSticker = stickersMap.get(trade.offeredStickerNumber);
            const requestedSticker = stickersMap.get(trade.requestedStickerNumber);

            if (!offeredSticker || !requestedSticker) return null;

            const isMyTrade = user && trade.creatorUsername.toLowerCase() === user.username.toLowerCase();
            const userHasRequested = user && (duplicatesMap[trade.requestedStickerNumber] || 0) > 0;

            return (
              <div
                key={trade.id}
                className={`bg-slate-900/90 border rounded-3xl p-5 space-y-4 shadow-xl relative transition-all ${
                  userHasRequested && !isMyTrade
                    ? 'border-emerald-500/60 shadow-emerald-500/5'
                    : 'border-slate-800'
                }`}
              >
                
                {/* Creator bar */}
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                      {trade.creatorUsername.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-200 block">{trade.creatorUsername}</span>
                      <span className="text-[10px] text-slate-500">Coleccionista</span>
                    </div>
                  </div>

                  {isMyTrade ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                      Tu Publicación
                    </span>
                  ) : userHasRequested ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Tienes el cromo pedido
                    </span>
                  ) : null}
                </div>

                {/* Offer VS Request Exchange Cards */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  
                  {/* Offered Card */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      OFRECE:
                    </span>
                    <div className="flex items-center gap-2">
                      <img
                        src={offeredSticker.imageUrl}
                        alt={offeredSticker.name}
                        className="w-12 h-14 object-cover rounded-lg border border-slate-700"
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-amber-400">#{offeredSticker.number}</span>
                        <h5 className="font-bold text-xs text-white truncate">{offeredSticker.name}</h5>
                        <p className="text-[10px] text-slate-400">{offeredSticker.team}</p>
                      </div>
                    </div>
                  </div>

                  {/* Requested Card */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      PIDE:
                    </span>
                    <div className="flex items-center gap-2">
                      <img
                        src={requestedSticker.imageUrl}
                        alt={requestedSticker.name}
                        className="w-12 h-14 object-cover rounded-lg border border-slate-700"
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-emerald-400">#{requestedSticker.number}</span>
                        <h5 className="font-bold text-xs text-white truncate">{requestedSticker.name}</h5>
                        <p className="text-[10px] text-slate-400">{requestedSticker.team}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Trade Button */}
                <div className="pt-2">
                  {isMyTrade ? (
                    <button
                      onClick={() => onCancelTrade(trade.id)}
                      className="w-full py-2 bg-slate-950 hover:bg-rose-950/50 text-rose-400 border border-slate-800 hover:border-rose-800 text-xs font-bold rounded-xl transition-colors"
                    >
                      Cancelar Oferta
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAcceptClick(trade.id)}
                      disabled={!userHasRequested || loadingAction === trade.id}
                      className={`w-full py-2.5 px-4 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                        userHasRequested
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
                          : 'bg-slate-950 text-slate-500 border border-slate-800 cursor-not-allowed'
                      }`}
                    >
                      {loadingAction === trade.id ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : userHasRequested ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>¡ACEPTAR TRUEQUE AHORA!</span>
                        </>
                      ) : (
                        <span>No tienes el cromo #{requestedSticker.number} repetido</span>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Create Trade Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-display font-extrabold text-xl text-white">
                Publicar Oferta de Intercambio
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Elige uno de tus cromos repetidos para entregar y selecciona el cromo que deseas recibir.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              
              {/* Select Offered Cromo */}
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  1. Cromo que Entregas (de tus repetidas)
                </label>
                {userDuplicatesList.length === 0 ? (
                  <p className="text-xs text-rose-400 p-2 bg-rose-950/40 rounded-xl">
                    No tienes cromos repetidos en tu inventario para ofrecer. Abre más sobres.
                  </p>
                ) : (
                  <select
                    value={selectedOffered}
                    onChange={e => setSelectedOffered(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    {userDuplicatesList.map(dup => {
                      const st = stickersMap.get(dup.number);
                      return (
                        <option key={dup.number} value={dup.number}>
                          #{dup.number} - {st?.name} ({st?.team}) [Tienes x{dup.count}]
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Select Requested Cromo */}
              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">
                  2. Cromo que Solicitas (del catálogo)
                </label>
                <select
                  value={selectedRequested}
                  onChange={e => setSelectedRequested(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  {stickers.map(st => (
                    <option key={st.number} value={st.number}>
                      #{st.number} - {st.name} ({st.team})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loadingAction === 'create' || userDuplicatesList.length === 0}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
              >
                {loadingAction === 'create' ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Publicar en el Mercadito'
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
