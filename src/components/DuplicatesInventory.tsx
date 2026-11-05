import React from 'react';
import { Sticker, User } from '../types';
import { Layers, Plus, RefreshCw, Star, ArrowRight } from 'lucide-react';
import { getCardThemeStyle } from '../utils/cardThemes';

interface DuplicatesInventoryProps {
  user: User | null;
  stickers: Sticker[];
  onStick: (stickerNumber: number) => Promise<void>;
  onOpenTradeModal: (offeredStickerNumber: number) => void;
  onGoToMarket: () => void;
  onOpenAuth: () => void;
}

export const DuplicatesInventory: React.FC<DuplicatesInventoryProps> = ({
  user,
  stickers,
  onStick,
  onOpenTradeModal,
  onGoToMarket,
  onOpenAuth
}) => {
  if (!user) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-white">Inventario de Repetidas</h2>
        <p className="text-xs text-slate-400">
          Inicia sesión para ver tus cromos repetidos y usarlos en trueques con otros usuarios.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  const duplicatesMap = user.duplicates || {};
  const duplicateEntries = Object.entries(duplicatesMap).map(([stNumStr, count]) => {
    const stNum = Number(stNumStr);
    const sticker = stickers.find(s => s.number === stNum);
    return { number: stNum, count: Number(count), sticker };
  }).filter(item => item.count > 0 && item.sticker) as { number: number; count: number; sticker: Sticker }[];

  const pastedSet = new Set(user?.pastedStickers || []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-amber-500/20 p-6 rounded-3xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Layers className="w-4 h-4" />
            <span>Pila de Repetidas</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            Tus Cromos Repetidos ({duplicateEntries.reduce((a, b) => a + b.count, 0)})
          </h1>
          <p className="text-xs text-slate-400">
            Úsalos para pegar espacios faltantes o intercámbialos en el mercadito en línea.
          </p>
        </div>

        <button
          onClick={onGoToMarket}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Ir al Mercadito de Trueque</span>
        </button>
      </div>

      {/* Grid of Duplicates */}
      {duplicateEntries.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-slate-600 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-white">No tienes cromos repetidos por ahora</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Abre sobres de estampas en la sección de sobres para acumular repetidas e intercambiarlas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {duplicateEntries.map(({ number, count, sticker }) => {
            const isPasted = pastedSet.has(number);
            const isHolo = sticker.rarity === 'dorada_holo';

            return (
              <div
                key={sticker.id}
                style={getCardThemeStyle(sticker)}
                className={`rounded-2xl p-3 border flex flex-col justify-between min-h-[280px] overflow-hidden ${
                  isHolo ? 'border-amber-400/80 shadow-lg shadow-amber-500/10' : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                      #{String(number).padStart(3, '0')}
                    </span>
                    <span className="text-xs font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md shadow">
                      x{count}
                    </span>
                  </div>

                  <div className={`w-full h-36 rounded-xl overflow-hidden my-1 ${
                    isHolo ? 'ring-2 ring-amber-400 animate-holo' : ''
                  }`}>
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>

                  <h4 className="font-display font-bold text-xs text-white truncate">{sticker.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sticker.team} · {sticker.position}</p>
                </div>

                {/* Actions */}
                <div className="space-y-2 mt-3 pt-3 border-t border-slate-800">
                  {!isPasted && (
                    <button
                      onClick={() => onStick(number)}
                      className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-[11px] rounded-lg shadow flex items-center justify-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Pegar en Álbum</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenTradeModal(number)}
                    className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ofrecer Trueque</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
