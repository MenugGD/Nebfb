import React, { useState } from 'react';
import { Sticker, User } from '../types';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, CheckCircle2, Star, Plus, ChevronRight } from 'lucide-react';

interface AlbumViewProps {
  stickers: Sticker[];
  user: User | null;
  onStick: (stickerNumber: number) => Promise<void>;
  onOpenPacksTab: () => void;
  onOpenAuth: () => void;
}

const ALBUM_COVER = '/src/assets/images/album_cover_mundial2026_1793815062794.jpg';

export const AlbumView: React.FC<AlbumViewProps> = ({
  stickers,
  user,
  onStick,
  onOpenPacksTab,
  onOpenAuth
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedStickerDetail, setSelectedStickerDetail] = useState<Sticker | null>(null);
  const [stickingNumber, setStickingNumber] = useState<number | null>(null);

  const categories = ['Todos', 'Especiales / Leyendas', 'Argentina', 'Brasil', 'España', 'Francia', 'Inglaterra', 'Sedes 2026', 'Cromos Especiales'];

  const filteredStickers = stickers.filter(s => {
    if (selectedCategory === 'Todos') return true;
    return s.category === selectedCategory;
  });

  const pastedSet = new Set(user?.pastedStickers || []);
  const duplicatesMap = user?.duplicates || {};

  const handleCategoryChange = (cat: string) => {
    sounds.playPageTurn();
    setSelectedCategory(cat);
  };

  const handleStickClick = async (stickerNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }

    setStickingNumber(stickerNumber);
    sounds.playStickerSlap();

    try {
      await onStick(stickerNumber);

      // Trigger Confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Check category completion
      const catStickers = stickers.filter(s => s.category === selectedCategory);
      if (catStickers.length > 0) {
        const nowPastedCount = catStickers.filter(s => pastedSet.has(s.number) || s.number === stickerNumber).length;
        if (nowPastedCount === catStickers.length) {
          sounds.playFanfare();
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.5 }
          });
        }
      }
    } catch {
      // Error handled in parent
    } finally {
      setStickingNumber(null);
    }
  };

  // Helper to resolve card background theme style
  const getCardBgStyle = (sticker: Sticker) => {
    if (sticker.bgTheme === 'custom_bg' && sticker.customBgUrl) {
      return { backgroundImage: `url(${sticker.customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (sticker.bgTheme === 'emerald_stadium') {
      return { background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' };
    }
    if (sticker.bgTheme === 'cosmic_purple') {
      return { background: 'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)' };
    }
    if (sticker.bgTheme === 'ruby_fire') {
      return { background: 'linear-gradient(135deg, #881337 0%, #450a0a 100%)' };
    }
    if (sticker.bgTheme === 'silver_metallic') {
      return { background: 'linear-gradient(135deg, #475569 0%, #0f172a 100%)' };
    }
    return {};
  };

  const totalAlbumStickers = stickers.length;
  const pastedTotal = user?.pastedStickers.length || 0;
  const totalPercentage = totalAlbumStickers > 0 ? Math.round((pastedTotal / totalAlbumStickers) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Album Cover Header */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-amber-500/30 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent z-10" />
        <img
          src={ALBUM_COVER}
          alt="Álbum Portada"
          className="absolute right-0 top-0 h-full w-2/3 object-cover object-center opacity-40 mix-blend-luminosity"
        />

        <div className="relative z-20 p-6 sm:p-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-4">
            <Trophy className="w-3.5 h-3.5" />
            <span>Colección Oficial Panini - 2026</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            ÁLUM DE CROMOS MUNDIAL 2026
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Gana puntos en el juego del arquero, abre sobres, sube tus propias fotos y completa el álbum oficial.
          </p>

          {/* Album Progress Bar */}
          <div className="mt-6 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Progreso del Álbum
              </span>
              <span className="text-amber-400 font-mono">{pastedTotal} de {totalAlbumStickers} Cromos ({totalPercentage}%)</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-md"
                style={{ width: `${totalPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat;
          const catStickers = cat === 'Todos' ? stickers : stickers.filter(s => s.category === cat);
          const catPasted = catStickers.filter(s => pastedSet.has(s.number)).length;
          const isCatComplete = catStickers.length > 0 && catPasted === catStickers.length;

          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{cat}</span>
              {isCatComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-950 fill-emerald-400" />
              ) : (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {catPasted}/{catStickers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sticker Grid View */}
      {filteredStickers.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
          <p className="text-sm font-bold text-slate-300">
            {stickers.length === 0
              ? 'El álbum no tiene cromos actualmente.'
              : `No hay cromos en la categoría "${selectedCategory}".`}
          </p>
          <p className="text-xs text-slate-500">
            {stickers.length === 0
              ? 'El administrador ha vaciado la colección o puedes crear nuevos cromos desde el panel de control.'
              : 'Selecciona otra categoría o explora "Todos" para ver los cromos disponibles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filteredStickers.map(sticker => {
          const isPasted = pastedSet.has(sticker.number);
          const hasDuplicateAvailable = (duplicatesMap[sticker.number] || 0) > 0;
          const isHolo = sticker.rarity === 'dorada_holo';

          return (
            <div
              key={sticker.id}
              onClick={() => setSelectedStickerDetail(sticker)}
              style={isPasted ? getCardBgStyle(sticker) : {}}
              className={`group relative rounded-2xl p-3 border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[260px] ${
                isPasted
                  ? isHolo
                    ? 'bg-slate-900 border-amber-400/80 shadow-xl shadow-amber-500/10 hover:scale-[1.02]'
                    : 'bg-slate-900/90 border-slate-700/80 shadow-md hover:border-slate-500 hover:scale-[1.02]'
                  : hasDuplicateAvailable
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10 hover:border-amber-400 hover:scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              
              {/* Top Header Row of Card Slot */}
              <div className="flex items-center justify-between mb-2 z-10">
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-950/80 text-amber-400 border border-slate-800">
                  #{String(sticker.number).padStart(3, '0')}
                </span>

                {isPasted ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    isHolo ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-emerald-400'
                  }`}>
                    {isHolo ? 'Dorado Holo' : 'Pegado'}
                  </span>
                ) : hasDuplicateAvailable ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 animate-pulse">
                    ¡Disponible! ({duplicatesMap[sticker.number]})
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500">
                    Falta
                  </span>
                )}
              </div>

              {/* Center Content: Sticker Image or Empty Slot */}
              <div className="relative flex-1 flex items-center justify-center my-2">
                {isPasted ? (
                  <div className={`relative w-full h-36 rounded-xl overflow-hidden border shadow-inner ${
                    isHolo ? 'border-amber-400 animate-holo p-0.5' : 'border-slate-700/60'
                  }`}>
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.name}
                      className="w-full h-full object-cover object-center rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    {isHolo && (
                      <div className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/60 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-xl bg-slate-950 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-2 font-mono font-bold text-sm">
                      #{sticker.number}
                    </div>
                    <span className="text-xs font-semibold text-slate-400 line-clamp-1">{sticker.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{sticker.team}</span>
                  </div>
                )}
              </div>

              {/* Bottom Footer Details / Stick Action */}
              <div className="z-10 mt-2">
                {isPasted ? (
                  <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/80">
                    <h3 className="font-display font-bold text-xs text-white truncate">{sticker.name}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center justify-between mt-0.5">
                      <span>{sticker.team}</span>
                      <span className="text-amber-400">{sticker.position}</span>
                    </p>
                  </div>
                ) : hasDuplicateAvailable ? (
                  <button
                    onClick={(e) => handleStickClick(sticker.number, e)}
                    disabled={stickingNumber === sticker.number}
                    className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    {stickingNumber === sticker.number ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Pegar en Álbum
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={onOpenPacksTab}
                    className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Conseguir en sobres</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
      )}

      {/* Sticker Detail Modal */}
      {selectedStickerDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedStickerDetail(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-950/80 text-white flex items-center justify-center hover:bg-slate-800"
            >
              ✕
            </button>

            <div
              style={getCardBgStyle(selectedStickerDetail)}
              className={`p-6 relative ${
                selectedStickerDetail.rarity === 'dorada_holo' ? 'animate-holo' : 'bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-slate-950 text-amber-400 border border-slate-800">
                  #{String(selectedStickerDetail.number).padStart(3, '0')}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200">
                  {selectedStickerDetail.rarity.replace('_', ' ')}
                </span>
              </div>

              <div className="w-full h-56 rounded-2xl overflow-hidden border border-slate-700/80 mb-4 shadow-xl">
                <img
                  src={selectedStickerDetail.imageUrl}
                  alt={selectedStickerDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <h3 className="font-display font-extrabold text-xl text-white">
                  {selectedStickerDetail.name}
                </h3>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  {selectedStickerDetail.team} · {selectedStickerDetail.position}
                </p>

                {selectedStickerDetail.stats && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      "{selectedStickerDetail.stats.description}"
                    </p>

                    {selectedStickerDetail.stats.pace && (
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold mt-2 pt-2 border-t border-slate-800/60">
                        <div className="bg-slate-900 p-2 rounded-lg flex justify-between">
                          <span className="text-slate-400">Ritmo:</span>
                          <span className="text-amber-400">{selectedStickerDetail.stats.pace}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg flex justify-between">
                          <span className="text-slate-400">Tiro:</span>
                          <span className="text-amber-400">{selectedStickerDetail.stats.shooting}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg flex justify-between">
                          <span className="text-slate-400">Pase:</span>
                          <span className="text-amber-400">{selectedStickerDetail.stats.passing}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg flex justify-between">
                          <span className="text-slate-400">Regate:</span>
                          <span className="text-amber-400">{selectedStickerDetail.stats.dribbling}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
