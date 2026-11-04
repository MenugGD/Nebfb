import React, { useState, useEffect } from 'react';
import { Sticker, User, TradeOffer } from './types';
import { Navbar } from './components/Navbar';
import { AlbumView } from './components/AlbumView';
import { PackOpener } from './components/PackOpener';
import { GoalkeeperMinigame } from './components/GoalkeeperMinigame';
import { AquaparkMinigame } from './components/AquaparkMinigame';
import { Match3Minigame } from './components/Match3Minigame';
import { DuplicatesInventory } from './components/DuplicatesInventory';
import { TradingMarket } from './components/TradingMarket';
import { RedeemView } from './components/RedeemView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { sounds } from './utils/audio';
import { Gamepad2, Shield, Trophy, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [activeTab, setActiveTab] = useState<'album' | 'packs' | 'minigame' | 'inventory' | 'trades' | 'codes' | 'admin'>('album');
  
  // Selected minigame within the Minigame Hub
  const [selectedMinigame, setSelectedMinigame] = useState<'goalkeeper' | 'aquapark' | 'match3'>('goalkeeper');

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [preSelectedTradeOffered, setPreSelectedTradeOffered] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    fetchStickers();
    fetchTrades();
    checkStoredAuth();
  }, []);

  const fetchStickers = async () => {
    try {
      const res = await fetch('/api/album/stickers');
      const data = await res.json();
      if (res.ok) {
        setStickers(data.stickers || []);
      }
    } catch (err) {
      console.error('Error fetching stickers:', err);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades');
      const data = await res.json();
      if (res.ok) {
        setTrades(data.trades || []);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
  };

  const checkStoredAuth = async () => {
    const savedUser = localStorage.getItem('album_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        refreshUser(u.username);
      } catch {
        // Bad storage
      }
    }
  };

  const refreshUser = async (username: string) => {
    try {
      const res = await fetch('/api/user/me', {
        headers: { 'x-user-name': username }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('album_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const handleAuthSuccess = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('album_user', JSON.stringify(userData));
    sounds.playCoin();
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('album_user');
    setActiveTab('album');
  };

  // Album Stick action
  const handleStickSticker = async (stickerNumber: number) => {
    if (!user) return;
    const res = await fetch('/api/album/stick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, stickerNumber })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error al pegar cromo');
      throw new Error(data.error);
    }
    setUser(data.user);
    localStorage.setItem('album_user', JSON.stringify(data.user));
  };

  // Open Booster Pack
  const handleOpenPack = async (): Promise<Sticker[]> => {
    if (!user) throw new Error('No autenticado');
    const res = await fetch('/api/packs/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error al abrir sobre');
      throw new Error(data.error);
    }
    setUser(data.user);
    localStorage.setItem('album_user', JSON.stringify(data.user));
    return data.pulledStickers;
  };

  // Buy Packs with Coins/Points
  const handleBuyPacks = async (amount: number) => {
    if (!user) return;
    const res = await fetch('/api/packs/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, amount })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error al comprar sobres');
      throw new Error(data.error);
    }
    setUser(data.user);
    localStorage.setItem('album_user', JSON.stringify(data.user));
  };

  // Earn Minigame Points
  const handleEarnMinigamePoints = async (points: number) => {
    if (!user) return;
    const res = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-user': 'MenugDDLC'
      },
      body: JSON.stringify({
        targetUsername: user.username,
        coins: points
      })
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setUser(data.user);
      localStorage.setItem('album_user', JSON.stringify(data.user));
    }
  };

  // Redeem Code
  const handleRedeemCode = async (code: string) => {
    if (!user) throw new Error('Inicia sesión para canjear códigos.');
    const res = await fetch('/api/codes/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, code })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Código inválido');
    }
    setUser(data.user);
    localStorage.setItem('album_user', JSON.stringify(data.user));
    return data;
  };

  // Trading
  const handleCreateTrade = async (offeredNum: number, requestedNum: number) => {
    if (!user) return;
    const res = await fetch('/api/trades/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        offeredStickerNumber: offeredNum,
        requestedStickerNumber: requestedNum
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al crear la oferta');
    }
    fetchTrades();
    refreshUser(user.username);
  };

  const handleAcceptTrade = async (tradeId: string) => {
    if (!user) return;
    const res = await fetch('/api/trades/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, username: user.username })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al aceptar intercambio');
    }
    setUser(data.user);
    localStorage.setItem('album_user', JSON.stringify(data.user));
    fetchTrades();
  };

  const handleCancelTrade = async (tradeId: string) => {
    if (!user) return;
    const res = await fetch('/api/trades/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, username: user.username })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al cancelar');
    }
    fetchTrades();
  };

  const handleOpenTradeFromInventory = (offeredNum: number) => {
    setPreSelectedTradeOffered(offeredNum);
    setActiveTab('trades');
  };

  const pastedCount = user?.pastedStickers.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Bar Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        pastedCount={pastedCount}
        totalStickers={stickers.length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Navigation Quick Strip for Minigame */}
        <div className="mb-6 flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">🎮 ¡Gana Puntos Jugando Minijuegos!</span>
            <span className="text-[11px] text-amber-400">Arquero, Aquapark 1v1 y Candy Crush Fútbol</span>
          </div>
          <button
            onClick={() => setActiveTab('minigame')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'minigame'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            Ver Minijuegos 🎮
          </button>
        </div>

        {activeTab === 'album' && (
          <AlbumView
            stickers={stickers}
            user={user}
            onStick={handleStickSticker}
            onOpenPacksTab={() => setActiveTab('packs')}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'packs' && (
          <PackOpener
            user={user}
            onOpenPack={handleOpenPack}
            onBuyPacks={handleBuyPacks}
            onOpenAuth={() => setIsAuthOpen(true)}
            onGoToAlbum={() => setActiveTab('album')}
          />
        )}

        {/* Minigames Hub View */}
        {activeTab === 'minigame' && (
          <div className="space-y-6">
            
            {/* Minigame Selector Selector Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedMinigame('goalkeeper')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  selectedMinigame === 'goalkeeper'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xl scale-[1.02]'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950/40 flex items-center justify-center text-xl shrink-0">
                  🧤
                </div>
                <div className="text-left">
                  <span className="font-display font-extrabold text-xs block">Minijuego del Arquero</span>
                  <span className="text-[10px] opacity-80">Adivina dónde atajar</span>
                </div>
              </button>

              <button
                onClick={() => setSelectedMinigame('aquapark')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  selectedMinigame === 'aquapark'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-xl scale-[1.02]'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950/40 flex items-center justify-center text-xl shrink-0">
                  🏄‍♂️
                </div>
                <div className="text-left">
                  <span className="font-display font-extrabold text-xs block">Aquapark.io 1v1</span>
                  <span className="text-[10px] opacity-80">Carrera apostada 1v1</span>
                </div>
              </button>

              <button
                onClick={() => setSelectedMinigame('match3')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  selectedMinigame === 'match3'
                    ? 'bg-yellow-500 text-slate-950 border-yellow-300 shadow-xl scale-[1.02]'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950/40 flex items-center justify-center text-xl shrink-0">
                  ⚽
                </div>
                <div className="text-left">
                  <span className="font-display font-extrabold text-xs block">Candy Crush Fútbol</span>
                  <span className="text-[10px] opacity-80">Match-3 de balones</span>
                </div>
              </button>
            </div>

            {/* Render Selected Minigame */}
            {selectedMinigame === 'goalkeeper' && (
              <GoalkeeperMinigame
                onEarnPoints={handleEarnMinigamePoints}
                userPoints={user?.coins || 0}
              />
            )}

            {selectedMinigame === 'aquapark' && (
              <AquaparkMinigame
                onEarnPoints={handleEarnMinigamePoints}
                userPoints={user?.coins || 0}
              />
            )}

            {selectedMinigame === 'match3' && (
              <Match3Minigame
                onEarnPoints={handleEarnMinigamePoints}
                userPoints={user?.coins || 0}
              />
            )}

          </div>
        )}

        {activeTab === 'inventory' && (
          <DuplicatesInventory
            user={user}
            stickers={stickers}
            onStick={handleStickSticker}
            onOpenTradeModal={handleOpenTradeFromInventory}
            onGoToMarket={() => setActiveTab('trades')}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'trades' && (
          <TradingMarket
            user={user}
            stickers={stickers}
            trades={trades}
            onCreateTrade={handleCreateTrade}
            onAcceptTrade={handleAcceptTrade}
            onCancelTrade={handleCancelTrade}
            onOpenAuth={() => setIsAuthOpen(true)}
            preSelectedOfferedNum={preSelectedTradeOffered}
          />
        )}

        {activeTab === 'codes' && (
          <RedeemView
            user={user}
            onRedeemCode={handleRedeemCode}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            user={user}
            stickers={stickers}
            onRefreshData={() => {
              fetchStickers();
              if (user) refreshUser(user.username);
            }}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Álbum Oficial de Cromos Mundial 2026 · Edición Panini Digital</span>
          <span className="text-slate-400">Admin Supremo: MenugDDLC</span>
        </div>
      </footer>

    </div>
  );
}
