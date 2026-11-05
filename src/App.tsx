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
import {
  testFirestoreConnection,
  initializeFirestoreSeed,
  getFirestoreStickers,
  subscribeFirestoreStickers,
  getFirestoreUser,
  subscribeFirestoreUser,
  updateUserInFirestore,
  subscribeFirestoreTrades,
  createFirestoreTrade,
  updateFirestoreTrade,
  deleteFirestoreTrade
} from './services/firebaseService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [activeTab, setActiveTab] = useState<'album' | 'packs' | 'minigame' | 'inventory' | 'trades' | 'codes' | 'admin'>('album');
  const [selectedMinigame, setSelectedMinigame] = useState<'goalkeeper' | 'aquapark' | 'match3'>('goalkeeper');
  const [preSelectedTradeOffered, setPreSelectedTradeOffered] = useState<number | null>(null);

  useEffect(() => {
    testFirestoreConnection();
    initializeFirestoreSeed();
    checkStoredAuth();

    // 1. Live real-time subscription to stickers catalog
    const unsubStickers = subscribeFirestoreStickers((liveStickers) => {
      setStickers(liveStickers);
    });

    // 2. Live real-time subscription to trades marketplace
    const unsubTrades = subscribeFirestoreTrades((liveTrades) => {
      setTrades(liveTrades);
    });

    return () => {
      if (typeof unsubStickers === 'function') unsubStickers();
      if (typeof unsubTrades === 'function') unsubTrades();
    };
  }, []);

  // Live real-time subscription to current user in Firestore
  useEffect(() => {
    if (!user?.username) return;

    // Immediately fetch fresh state from Firestore
    getFirestoreUser(user.username).then(remoteUser => {
      if (remoteUser) {
        setUser(remoteUser);
        localStorage.setItem('album_user', JSON.stringify(remoteUser));
      }
    });

    // Live sync whenever points/packs/stickers change on Vercel or anywhere
    const unsubUser = subscribeFirestoreUser(user.username, (liveUser) => {
      if (liveUser) {
        setUser(liveUser);
        localStorage.setItem('album_user', JSON.stringify(liveUser));
      }
    });

    return () => {
      if (typeof unsubUser === 'function') unsubUser();
    };
  }, [user?.username]);

  const loadStickersFromFirestore = async () => {
    try {
      const list = await getFirestoreStickers();
      if (list && list.length > 0) {
        setStickers(list.sort((a, b) => a.number - b.number));
      }
    } catch {
      // Keep default
    }
  };

  const handleDeleteSticker = (stNum: number) => {
    setStickers(prev => prev.filter(s => s.number !== stNum));
  };

  const handleDeleteMultipleStickers = (stNums: number[]) => {
    const numSet = new Set(stNums);
    setStickers(prev => prev.filter(s => !numSet.has(s.number)));
  };

  const handleDeleteAllStickers = () => {
    setStickers([]);
  };

  const handleSaveSticker = (newSticker: Sticker) => {
    setStickers(prev => {
      const filtered = prev.filter(s => s.number !== newSticker.number);
      return [...filtered, newSticker].sort((a, b) => a.number - b.number);
    });
  };

  const checkStoredAuth = () => {
    const savedUser = localStorage.getItem('album_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.username) {
          setUser(u);
        }
      } catch {
        setUser(null);
      }
    }
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('album_user', JSON.stringify(userData));
    updateUserInFirestore(userData);
    sounds.playCoin();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('album_user');
    setActiveTab('album');
  };

  const saveUserToFirebase = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('album_user', JSON.stringify(updatedUser));
    updateUserInFirestore(updatedUser);
  };

  const handleStickSticker = async (stickerNumber: number) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      pastedStickers: [...(user.pastedStickers || []), stickerNumber].sort((a, b) => a - b),
      duplicates: {
        ...(user.duplicates || {}),
        [stickerNumber]: Math.max(0, ((user.duplicates || {})[stickerNumber] || 1) - 1)
      }
    };
    if (updatedUser.duplicates[stickerNumber] === 0) {
      delete updatedUser.duplicates[stickerNumber];
    }
    saveUserToFirebase(updatedUser);
  };

  const handleOpenPack = async (): Promise<Sticker[]> => {
    if (!user) throw new Error('Debes iniciar sesión.');
    if (user.packsCount <= 0) throw new Error('No tienes sobres disponibles.');
    if (stickers.length === 0) throw new Error('No hay cromos disponibles en el álbum en este momento.');

    const pulled: Sticker[] = [];
    const newDuplicates = { ...(user.duplicates || {}) };

    for (let i = 0; i < 5; i++) {
      const randSticker = stickers[Math.floor(Math.random() * stickers.length)];
      if (randSticker) {
        pulled.push(randSticker);
        newDuplicates[randSticker.number] = (newDuplicates[randSticker.number] || 0) + 1;
      }
    }

    const updatedUser: User = {
      ...user,
      packsCount: user.packsCount - 1,
      duplicates: newDuplicates
    };

    saveUserToFirebase(updatedUser);
    return pulled;
  };

  const handleBuyPacks = async (amount: number) => {
    if (!user) return;
    const cost = amount * 100;
    if (user.coins < cost) throw new Error('Puntos insuficientes');

    const updatedUser: User = {
      ...user,
      coins: user.coins - cost,
      packsCount: user.packsCount + amount
    };

    saveUserToFirebase(updatedUser);
  };

  const handleEarnMinigamePoints = async (points: number) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      coins: Math.max(0, user.coins + points)
    };
    saveUserToFirebase(updatedUser);
  };

  const handleRedeemCode = async (code: string) => {
    if (!user) throw new Error('Inicia sesión para canjear códigos.');
    const cleanCode = code.trim().toUpperCase();

    if ((user.redeemedCodes || []).includes(cleanCode)) {
      throw new Error('Ya has canjeado este código previamente.');
    }

    let reward = { packs: 3, coins: 300, bonusSticker: undefined as Sticker | undefined };
    if (cleanCode === 'MENUG1011') {
      reward = { packs: 10, coins: 500, bonusSticker: stickers[0] };
    } else if (cleanCode === 'MUNDIAL2026') {
      reward = { packs: 5, coins: 300, bonusSticker: undefined };
    } else if (cleanCode === 'ORO2026') {
      reward = { packs: 2, coins: 1000, bonusSticker: stickers[4] };
    }

    const newDuplicates = { ...(user.duplicates || {}) };
    if (reward.bonusSticker) {
      newDuplicates[reward.bonusSticker.number] = (newDuplicates[reward.bonusSticker.number] || 0) + 1;
    }

    const updatedUser: User = {
      ...user,
      packsCount: user.packsCount + reward.packs,
      coins: user.coins + reward.coins,
      duplicates: newDuplicates,
      redeemedCodes: [...(user.redeemedCodes || []), cleanCode]
    };

    saveUserToFirebase(updatedUser);
    return { reward };
  };

  const handleCreateTrade = async (offeredNum: number, requestedNum: number) => {
    if (!user) return;
    const newTrade: TradeOffer = {
      id: `trd_${Date.now()}`,
      creatorUsername: user.username,
      offeredStickerNumber: offeredNum,
      requestedStickerNumber: requestedNum,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setTrades(prev => [newTrade, ...prev]);
    await createFirestoreTrade(newTrade);
  };

  const handleAcceptTrade = async (tradeId: string) => {
    if (!user) return;
    const trade = trades.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'active') return;

    const newDuplicates = { ...(user.duplicates || {}) };
    newDuplicates[trade.requestedStickerNumber] = Math.max(0, (newDuplicates[trade.requestedStickerNumber] || 1) - 1);
    if (newDuplicates[trade.requestedStickerNumber] === 0) delete newDuplicates[trade.requestedStickerNumber];
    newDuplicates[trade.offeredStickerNumber] = (newDuplicates[trade.offeredStickerNumber] || 0) + 1;

    const updatedUser: User = {
      ...user,
      duplicates: newDuplicates
    };

    saveUserToFirebase(updatedUser);
    setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: 'completed' as const, completedBy: user.username } : t));
    await updateFirestoreTrade(tradeId, { status: 'completed', completedBy: user.username });
  };

  const handleCancelTrade = async (tradeId: string) => {
    if (!user) return;
    setTrades(prev => prev.filter(t => t.id !== tradeId));
    await updateFirestoreTrade(tradeId, { status: 'cancelled' });
  };

  const handleOpenTradeFromInventory = (offeredNum: number) => {
    setPreSelectedTradeOffered(offeredNum);
    setActiveTab('trades');
  };

  // Mandatory Login Screen
  if (!user) {
    return (
      <AuthModal
        isOpen={true}
        onSuccess={handleAuthSuccess}
        isMandatoryScreen={true}
      />
    );
  }

  const pastedCount = user.pastedStickers?.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => {}}
        onLogout={handleLogout}
        pastedCount={pastedCount}
        totalStickers={stickers.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
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
            onOpenAuth={() => {}}
          />
        )}

        {activeTab === 'packs' && (
          <PackOpener
            user={user}
            onOpenPack={handleOpenPack}
            onBuyPacks={handleBuyPacks}
            onOpenAuth={() => {}}
            onGoToAlbum={() => setActiveTab('album')}
          />
        )}

        {activeTab === 'minigame' && (
          <div className="space-y-6">
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

            {selectedMinigame === 'goalkeeper' && (
              <GoalkeeperMinigame
                onEarnPoints={handleEarnMinigamePoints}
                userPoints={user.coins}
              />
            )}

            {selectedMinigame === 'aquapark' && (
              <AquaparkMinigame
                onEarnPoints={handleEarnMinigamePoints}
                userPoints={user.coins}
                currentUser={user}
              />
            )}

            {selectedMinigame === 'match3' && (
              <Match3Minigame
                onEarnPoints={handleEarnMinigamePoints}
                userPoints={user.coins}
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
            onOpenAuth={() => {}}
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
            onOpenAuth={() => {}}
            preSelectedOfferedNum={preSelectedTradeOffered}
          />
        )}

        {activeTab === 'codes' && (
          <RedeemView
            user={user}
            onRedeemCode={handleRedeemCode}
            onOpenAuth={() => {}}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            user={user}
            stickers={stickers}
            onRefreshData={() => {
              loadStickersFromFirestore();
            }}
            onDeleteSticker={handleDeleteSticker}
            onDeleteMultipleStickers={handleDeleteMultipleStickers}
            onDeleteAllStickers={handleDeleteAllStickers}
            onSaveSticker={handleSaveSticker}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Álbum Oficial de Cromos Mundial 2026 · Conectado a Firebase Firestore</span>
          <span className="text-slate-400">Admin Supremo: MenugDDLC</span>
        </div>
      </footer>

    </div>
  );
}
