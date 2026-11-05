import React from 'react';
import { User } from '../types';
import { Trophy, Package, RefreshCw, KeyRound, ShieldAlert, LogIn, LogOut, User as UserIcon, Coins, Sparkles, Layers, Gamepad2 } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: 'album' | 'packs' | 'minigame' | 'inventory' | 'trades' | 'codes' | 'admin';
  setActiveTab: (tab: 'album' | 'packs' | 'minigame' | 'inventory' | 'trades' | 'codes' | 'admin') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  pastedCount: number;
  totalStickers: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  pastedCount,
  totalStickers
}) => {
  const percentage = totalStickers > 0 ? Math.round((pastedCount / totalStickers) * 100) : 0;
  const duplicateTotal = user ? Object.values(user.duplicates || {}).reduce((a, b) => a + b, 0) : 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveTab('album')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 p-0.5 shadow-md group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent block">
                  MUNDIAL 2026
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400 block -mt-1">
                  Álbum de Cromos
                </span>
              </div>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('album')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'album'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Álbum ({pastedCount}/{totalStickers})
            </button>

            <button
              onClick={() => setActiveTab('packs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'packs'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              Sobres ({user?.packsCount || 0})
            </button>

            <button
              onClick={() => setActiveTab('minigame')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'minigame'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              Minijuegos (Ganar Puntos)
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Repetidas ({duplicateTotal})
            </button>

            <button
              onClick={() => setActiveTab('trades')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'trades'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Mercadito
            </button>

            <button
              onClick={() => setActiveTab('codes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'codes'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              Códigos
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-rose-950/50 text-rose-300 border border-rose-800/50 hover:bg-rose-900/40'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* User Status / Account Bar */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                {/* User Coins & Progress */}
                <div className="flex items-center gap-2.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500/40 shadow">
                  <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-black">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>{user.coins} pts</span>
                  </div>

                  <div className="w-px h-4 bg-slate-800" />

                  <div className="flex items-center gap-1 text-xs text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono font-bold text-emerald-400">{percentage}%</span>
                  </div>
                </div>

                {/* Account badge */}
                <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 pl-3 rounded-xl border border-slate-700/60">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-100 leading-none">
                      {user.username}
                    </span>
                    {user.role === 'admin' ? (
                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Admin</span>
                    ) : (
                      <span className="text-[9px] text-amber-400 uppercase tracking-wider">Coleccionista</span>
                    )}
                  </div>
                  <button
                    onClick={onLogout}
                    title="Cerrar sesión"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 transition-all shadow-md active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Subnav Bar */}
      <div className="md:hidden flex items-center justify-around bg-slate-950 py-2 border-t border-slate-800 text-xs font-medium overflow-x-auto px-2">
        <button
          onClick={() => setActiveTab('album')}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${
            activeTab === 'album' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Álbum</span>
        </button>

        <button
          onClick={() => setActiveTab('packs')}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${
            activeTab === 'packs' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Sobres</span>
        </button>

        <button
          onClick={() => setActiveTab('minigame')}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${
            activeTab === 'minigame' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Gamepad2 className="w-4 h-4 text-emerald-400" />
          <span>Minijuegos</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${
            activeTab === 'inventory' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Repetidas</span>
        </button>

        <button
          onClick={() => setActiveTab('trades')}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${
            activeTab === 'trades' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Trueque</span>
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${
            activeTab === 'codes' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Códigos</span>
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${
              activeTab === 'admin' ? 'text-rose-400 font-bold' : 'text-rose-500/70'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Admin</span>
          </button>
        )}
      </div>
    </header>
  );
};
