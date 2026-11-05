import React, { useState, useEffect } from 'react';
import { Sticker, User, RedeemCode } from '../types';
import { sounds } from '../utils/audio';
import {
  Shield,
  Plus,
  Minus,
  Gift,
  Trash2,
  Edit,
  Sparkles,
  Users,
  KeyRound,
  Layers,
  CheckCircle2,
  AlertCircle,
  Upload,
  Palette,
  Cpu,
  Coins,
  Package,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import { safeFetchJson } from '../services/api';
import {
  deleteStickerFromFirestore,
  deleteMultipleStickersFromFirestore,
  deleteAllStickersFromFirestore,
  restoreDefaultStickersToFirestore,
  saveStickerToFirestore,
  getFirestoreUsers,
  adminModifyUserInFirestore,
  adminRemoveUserSticker,
  saveCodeToFirestore
} from '../services/firebaseService';

interface AdminPanelProps {
  user: User | null;
  stickers: Sticker[];
  onRefreshData: () => void;
  onDeleteSticker?: (stickerNumber: number) => void;
  onDeleteMultipleStickers?: (stickerNumbers: number[]) => void;
  onDeleteAllStickers?: () => void;
  onSaveSticker?: (sticker: Sticker) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  stickers,
  onRefreshData,
  onDeleteSticker,
  onDeleteMultipleStickers,
  onDeleteAllStickers,
  onSaveSticker
}) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'stickers' | 'codes' | 'ai'>('users');
  const [selectedStickerNumbers, setSelectedStickerNumbers] = useState<number[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);

  // Grant / Take state
  const [targetUser, setTargetUser] = useState<string>('');
  const [actionMode, setActionMode] = useState<'add' | 'subtract'>('add');
  const [grantPacks, setGrantPacks] = useState<number>(5);
  const [grantCoins, setGrantCoins] = useState<number>(500);
  const [grantStickerNum, setGrantStickerNum] = useState<number>(0);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Sticker form state
  const [editingSticker, setEditingSticker] = useState<Partial<Sticker>>({
    number: stickers.length + 1,
    name: '',
    category: 'Especiales / Leyendas',
    team: 'FIFA',
    position: 'Delantero',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    bgTheme: 'gold_holo',
    customBgUrl: '',
    stats: { description: 'Cromo creado por MenugDDLC' }
  });

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  // Code creation state
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodePacks, setNewCodePacks] = useState(5);
  const [newCodeCoins, setNewCodeCoins] = useState(300);
  const [newCodeStickerNum, setNewCodeStickerNum] = useState<number>(0);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(100);
  const [newCodeDesc, setNewCodeDesc] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // 1. Direct from Firestore
      const firestoreUsers = await getFirestoreUsers();
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsersList(firestoreUsers);
        if (!targetUser) {
          setTargetUser(firestoreUsers[0].username);
        }
        return;
      }

      // 2. Fallback to backend safely
      const data = await safeFetchJson<{ users: User[] }>('/api/admin/users', {
        headers: { 'x-admin-user': user?.username || '' }
      });
      if (data && data.users && data.users.length > 0) {
        setUsersList(data.users);
        if (!targetUser) {
          setTargetUser(data.users[0].username);
        }
      }
    } catch {
      // Catch silently
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-white">Acceso Denegado</h2>
        <p className="text-xs text-slate-400">
          Esta sección está reservada exclusivamente para el administrador supremo <strong className="text-amber-400">MenugDDLC</strong>.
        </p>
      </div>
    );
  }

  // File Upload Handlers
  const handleStickerPhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setEditingSticker(prev => ({ ...prev, imageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setEditingSticker(prev => ({
          ...prev,
          bgTheme: 'custom_bg',
          customBgUrl: result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGrantOrDeductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const multiplier = actionMode === 'add' ? 1 : -1;
    const finalPacks = grantPacks * multiplier;
    const finalCoins = grantCoins * multiplier;

    try {
      // 1. Direct Firebase Firestore update
      await adminModifyUserInFirestore(targetUser, {
        packsCount: finalPacks,
        coins: finalCoins,
        stickerNumber: grantStickerNum > 0 ? grantStickerNum : undefined
      });

      // 2. Safe background Express sync
      safeFetchJson('/api/admin/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify({
          targetUsername: targetUser,
          packsCount: finalPacks,
          coins: finalCoins,
          stickerNumber: grantStickerNum > 0 ? grantStickerNum : undefined
        })
      }).catch(() => {});

      sounds.playCoin();
      const actionText = actionMode === 'add' ? 'entregados a' : 'retirados de';
      setMsg({ text: `¡${grantCoins} puntos y ${grantPacks} sobres ${actionText} ${targetUser} con éxito!` });
      fetchUsers();
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al actualizar usuario', isError: true });
    }
  };

  const handleQuickModifyPoints = async (username: string, deltaCoins: number, deltaPacks: number = 0) => {
    setMsg(null);
    try {
      // 1. Direct Firebase Firestore update
      await adminModifyUserInFirestore(username, {
        coins: deltaCoins,
        packsCount: deltaPacks
      });

      // 2. Safe background Express sync
      safeFetchJson('/api/admin/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify({
          targetUsername: username,
          coins: deltaCoins,
          packsCount: deltaPacks
        })
      }).catch(() => {});

      sounds.playCoin();
      const sign = deltaCoins > 0 ? '+' : '';
      setMsg({ text: `Actualizado: ${username} (${sign}${deltaCoins} Puntos / ${deltaPacks} Sobres)` });
      fetchUsers();
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al modificar puntos', isError: true });
    }
  };

  const handleTakeSticker = async (username: string, stickerNumber: number) => {
    setMsg(null);
    try {
      // 1. Direct Firebase Firestore update
      await adminRemoveUserSticker(username, stickerNumber);

      // 2. Safe background Express sync
      safeFetchJson('/api/admin/take', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify({
          targetUsername: username,
          stickerNumber
        })
      }).catch(() => {});

      setMsg({ text: `Cromo #${stickerNumber} retirado a ${username}` });
      fetchUsers();
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al retirar cromo', isError: true });
    }
  };

  const handleSaveSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const stickerToSave: Sticker = {
        id: editingSticker.id || `cromo_${String(editingSticker.number || stickers.length + 1).padStart(3, '0')}`,
        number: Number(editingSticker.number || stickers.length + 1),
        name: editingSticker.name || 'Nuevo Cromo',
        category: editingSticker.category || 'Especiales / Leyendas',
        team: editingSticker.team || 'FIFA',
        position: editingSticker.position || 'Delantero',
        rarity: editingSticker.rarity || 'comun',
        imageUrl: editingSticker.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
        bgTheme: editingSticker.bgTheme || 'gold_holo',
        customBgUrl: editingSticker.customBgUrl || '',
        stats: editingSticker.stats || { description: 'Cromo creado por MenugDDLC' }
      };

      // 1. Direct Firebase Firestore save
      await saveStickerToFirestore(stickerToSave);

      // 2. Immediate React State update
      if (onSaveSticker) onSaveSticker(stickerToSave);

      // 3. Safe background Express sync
      safeFetchJson('/api/admin/stickers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify(stickerToSave)
      }).catch(() => {});

      sounds.playCardReveal(true);
      setMsg({ text: `¡Cromo #${stickerToSave.number} (${stickerToSave.name}) guardado con éxito en Firebase!` });
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al guardar cromo', isError: true });
    }
  };

  const toggleSelectSticker = (stickerNumber: number) => {
    setSelectedStickerNumbers(prev =>
      prev.includes(stickerNumber)
        ? prev.filter(n => n !== stickerNumber)
        : [...prev, stickerNumber]
    );
  };

  const handleSelectAll = () => {
    if (selectedStickerNumbers.length === stickers.length) {
      setSelectedStickerNumbers([]);
    } else {
      setSelectedStickerNumbers(stickers.map(s => s.number));
    }
  };

  const handleDeleteSticker = async (stNum: number) => {
    if (!confirm(`¿Eliminar cromo #${stNum}?`)) return;
    setMsg(null);
    try {
      // 1. Immediate React state removal
      if (onDeleteSticker) {
        onDeleteSticker(stNum);
      }

      // 2. Delete directly from Firebase Firestore
      await deleteStickerFromFirestore(stNum);

      // 3. Safe background Express sync (never crashes if static host)
      safeFetchJson('/api/admin/stickers/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify({ stickerNumber: stNum })
      }).catch(() => {});

      sounds.playPackTear();
      setSelectedStickerNumbers(prev => prev.filter(n => n !== stNum));
      setMsg({ text: `¡Cromo #${stNum} eliminado con éxito de Firebase y del álbum!` });
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al eliminar cromo', isError: true });
    }
  };

  const handleDeleteMultipleStickers = async () => {
    if (selectedStickerNumbers.length === 0) return;
    const count = selectedStickerNumbers.length;
    if (!confirm(`¿Eliminar los ${count} cromos seleccionados?\nSe borrarán de Firebase y del álbum de forma permanente, y NO se volverán a regenerar.`)) {
      return;
    }

    setIsDeletingBatch(true);
    setMsg(null);
    try {
      // 1. Optimistic React state update
      if (onDeleteMultipleStickers) {
        onDeleteMultipleStickers(selectedStickerNumbers);
      }

      // 2. Direct Firestore batch deletion
      await deleteMultipleStickersFromFirestore(selectedStickerNumbers);

      // 3. Safe background Express sync
      safeFetchJson('/api/admin/stickers/delete-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify({ stickerNumbers: selectedStickerNumbers })
      }).catch(() => {});

      sounds.playPackTear();
      setMsg({ text: `¡${count} cromos seleccionados eliminados permanentemente de Firebase!` });
      setSelectedStickerNumbers([]);
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al eliminar cromos seleccionados', isError: true });
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleDeleteAllStickers = async () => {
    if (stickers.length === 0) return;
    if (!confirm(`⚠️ ATENCIÓN: ¿Deseas eliminar TODOS los ${stickers.length} cromos del álbum?\nEsta acción vaciará por completo la base de datos de Firebase y los cromos NO se regenerarán automáticamente.`)) {
      return;
    }
    if (!confirm('⚠️ Confirmación final: ¿Seguro que deseas vaciar el álbum completamente?')) {
      return;
    }

    setIsDeletingBatch(true);
    setMsg(null);
    try {
      // 1. Optimistic React state update
      if (onDeleteAllStickers) {
        onDeleteAllStickers();
      }

      // 2. Direct Firestore deletion
      await deleteAllStickersFromFirestore();

      // 3. Safe background Express sync
      safeFetchJson('/api/admin/stickers/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        }
      }).catch(() => {});

      sounds.playPackTear();
      setMsg({ text: '¡Todos los cromos han sido eliminados de Firebase y el álbum ha quedado vacío!' });
      setSelectedStickerNumbers([]);
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al vaciar los cromos', isError: true });
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleRestoreDefaultCatalog = async () => {
    if (!confirm('¿Deseas restaurar el catálogo oficial de los 40 cromos del Mundial 2026 en Firebase?')) {
      return;
    }
    setIsDeletingBatch(true);
    setMsg(null);
    try {
      await restoreDefaultStickersToFirestore();
      safeFetchJson('/api/admin/stickers/restore-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        }
      }).catch(() => {});

      sounds.playFanfare();
      setMsg({ text: '¡Catálogo oficial de 40 cromos restaurado en Firebase con éxito!' });
      setSelectedStickerNumbers([]);
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al restaurar catálogo', isError: true });
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleGenerateAiSticker = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    setMsg(null);
    try {
      const data = await safeFetchJson<any>('/api/ai/generate-sticker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      const aiData = data?.stickerData || {
        name: aiPrompt.trim(),
        category: 'Especiales / Leyendas',
        team: 'Mundial',
        position: 'Delantero',
        rarity: 'dorada_holo',
        pace: 92,
        shooting: 91,
        passing: 87,
        dribbling: 93,
        description: `Estrella mundial de fútbol: ${aiPrompt.trim()}.`
      };

      setEditingSticker({
        number: stickers.length + 1,
        name: aiData.name || 'Jugador Estrella AI',
        category: aiData.category || 'Especiales / Leyendas',
        team: aiData.team || 'Mundial',
        position: aiData.position || 'Delantero',
        rarity: aiData.rarity || 'dorada_holo',
        imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
        bgTheme: 'gold_holo',
        customBgUrl: '',
        stats: {
          pace: aiData.pace || 90,
          shooting: aiData.shooting || 88,
          passing: aiData.passing || 85,
          dribbling: aiData.dribbling || 92,
          description: aiData.description || 'Creado con Inteligencia Artificial Gemini.'
        }
      });
      setActiveTab('stickers');
      setMsg({ text: '¡Cromo generado con Gemini AI! Puedes adjuntar una foto de tu celular antes de guardar.' });
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al generar cromo', isError: true });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeName.trim()) return;
    setMsg(null);
    try {
      const cleanCode = newCodeName.trim().toUpperCase();
      const codeObj: RedeemCode = {
        code: cleanCode,
        rewardPacks: Number(newCodePacks) || 0,
        rewardCoins: Number(newCodeCoins) || 0,
        rewardStickerNumber: newCodeStickerNum > 0 ? newCodeStickerNum : undefined,
        maxUses: Number(newCodeMaxUses) || 100,
        timesUsed: 0,
        description: newCodeDesc || `Código creado por MenugDDLC`
      };

      // 1. Direct Firebase Firestore save
      await saveCodeToFirestore(codeObj);

      // 2. Safe background Express sync
      safeFetchJson('/api/admin/codes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user?.username || ''
        },
        body: JSON.stringify(codeObj)
      }).catch(() => {});

      setMsg({ text: `Código ${cleanCode} creado con éxito y guardado en Firebase.` });
      setNewCodeName('');
      setNewCodeDesc('');
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al crear código', isError: true });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 border border-rose-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-black text-white">PANEL ADMINISTRADOR SUPREMO</h1>
              <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-extrabold uppercase tracking-wider">
                MenugDDLC
              </span>
            </div>
            <p className="text-xs text-rose-200/80 mt-1">
              Dar o Quitar Puntos/Monedas, gestionar sobres, subir fotos y controlar el álbum.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Alert Messages */}
      {msg && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg ${
          msg.isError
            ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
            : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
        }`}>
          {msg.isError ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Dar / Quitar Puntos y Sobres
        </button>

        <button
          onClick={() => setActiveTab('stickers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stickers'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Fotos, Fondos y Cromos
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ai'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4 text-amber-400" />
          Generador Gemini AI
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'codes'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Crear Códigos
        </button>
      </div>

      {/* TAB 1: Grant / Take from Users */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form */}
          <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Gestor de Puntos y Sobres
            </h3>

            {/* Mode Selector: Add or Subtract */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActionMode('add')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  actionMode === 'add'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Dar (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionMode('subtract')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  actionMode === 'subtract'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Quitar (-)</span>
              </button>
            </div>

            <form onSubmit={handleGrantOrDeductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Usuario Destino
                </label>
                <select
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  {usersList.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.username} ({u.role}) - {u.coins} Pts - {u.packsCount} Sobres
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Puntos / Monedas {actionMode === 'add' ? 'a Entregar' : 'a Quitar'}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={grantCoins}
                  onChange={e => setGrantCoins(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sobres {actionMode === 'add' ? 'a Entregar' : 'a Quitar'}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={grantPacks}
                  onChange={e => setGrantPacks(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              {actionMode === 'add' && (
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">
                    Regalar Cromo Específico (#1 - #{stickers.length})
                  </label>
                  <select
                    value={grantStickerNum}
                    onChange={e => setGrantStickerNum(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value={0}>Ningún Cromo Específico</option>
                    {stickers.map(s => (
                      <option key={s.number} value={s.number}>
                        #{s.number} - {s.name} ({s.rarity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 font-black text-xs rounded-xl shadow-lg transition-all ${
                  actionMode === 'add'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400'
                    : 'bg-rose-600 text-white hover:bg-rose-500'
                }`}
              >
                {actionMode === 'add' ? '¡ENTREGAR BENEFICIOS!' : '¡QUITAR PUNTOS / SOBRES!'}
              </button>
            </form>
          </div>

          {/* Users Inspection & Quick Modify Buttons */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-400" />
              Acciones Rápidas por Usuario
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Puntos</th>
                    <th className="py-2.5 px-3">Sobres</th>
                    <th className="py-2.5 px-3 text-right">Modificar Puntos</th>
                    <th className="py-2.5 px-3 text-right">Modificar Sobres</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{u.username}</span>
                        <span className="text-[10px] text-slate-500">{u.role}</span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {u.coins} pts
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        {u.packsCount}
                      </td>

                      {/* Quick Points +/- Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleQuickModifyPoints(u.username, -500, 0)}
                            className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded text-[10px] font-bold"
                            title="Quitar 500 Puntos"
                          >
                            -500 Pts
                          </button>
                          <button
                            onClick={() => handleQuickModifyPoints(u.username, 500, 0)}
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded text-[10px] font-bold"
                            title="Dar 500 Puntos"
                          >
                            +500 Pts
                          </button>
                        </div>
                      </td>

                      {/* Quick Packs +/- Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleQuickModifyPoints(u.username, 0, -5)}
                            className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded text-[10px] font-bold"
                            title="Quitar 5 Sobres"
                          >
                            -5 Sobres
                          </button>
                          <button
                            onClick={() => handleQuickModifyPoints(u.username, 0, 5)}
                            className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 rounded text-[10px] font-bold"
                            title="Dar 5 Sobres"
                          >
                            +5 Sobres
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Sticker Management */}
      {activeTab === 'stickers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="font-display font-extrabold text-base text-white">
              {editingSticker.id ? 'Editar Cromo & Fondo' : 'Crear Cromo & Fondo'}
            </h3>

            <form onSubmit={handleSaveSticker} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Número de Slot</label>
                <input
                  type="number"
                  required
                  value={editingSticker.number || ''}
                  onChange={e => setEditingSticker({ ...editingSticker, number: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Nombre del Jugador</label>
                <input
                  type="text"
                  required
                  value={editingSticker.name || ''}
                  onChange={e => setEditingSticker({ ...editingSticker, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <label className="block text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Subir Foto del Jugador (Celular / PC)</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleStickerPhotoFileUpload}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer w-full"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <label className="block text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>Fondo de la Estampilla</span>
                </label>

                <select
                  value={editingSticker.bgTheme || 'gold_holo'}
                  onChange={e => setEditingSticker({ ...editingSticker, bgTheme: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                >
                  <option value="gold_holo">Oro Holográfico Brillo</option>
                  <option value="emerald_stadium">Estadio Esmeralda Nocturno</option>
                  <option value="cosmic_purple">Púrpura Cósmico Estelar</option>
                  <option value="ruby_fire">Fuego Rubí Pasión</option>
                  <option value="silver_metallic">Plata Metalizada</option>
                  <option value="custom_bg">Imagen Personalizada Subida</option>
                </select>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Subir Imagen de Fondo Personalizada (Celular / PC)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomBgFileUpload}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white font-bold text-xs rounded-xl shadow transition-all"
              >
                Guardar Cromo y Fondo
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            {/* Header with Title and Global Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                  <span>Catálogo de Cromos</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono text-xs">
                    {stickers.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Selecciona varios cromos con las casillas para eliminarlos en lote.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {stickers.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      disabled={isDeletingBatch}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      title={selectedStickerNumbers.length === stickers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    >
                      {selectedStickerNumbers.length === stickers.length ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Deseleccionar Todos</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          <span>Seleccionar Todos</span>
                        </>
                      )}
                    </button>

                    {selectedStickerNumbers.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteMultipleStickers}
                        disabled={isDeletingBatch}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all animate-pulse"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Borrar Seleccionados ({selectedStickerNumbers.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDeleteAllStickers}
                      disabled={isDeletingBatch}
                      className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      title="Eliminar todos los cromos del álbum"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar TODOS</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleRestoreDefaultCatalog}
                  disabled={isDeletingBatch}
                  className="px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Restaurar catálogo inicial oficial (40 cromos)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar 40 Iniciales</span>
                </button>
              </div>
            </div>

            {/* Selection Banner if items selected */}
            {selectedStickerNumbers.length > 0 && (
              <div className="bg-rose-950/50 border border-rose-800/60 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-rose-300 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-rose-400" />
                  <span>{selectedStickerNumbers.length} cromos seleccionados para borrar</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStickerNumbers([])}
                    className="text-slate-400 hover:text-white underline text-[11px]"
                  >
                    Cancelar selección
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteMultipleStickers}
                    disabled={isDeletingBatch}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow"
                  >
                    {isDeletingBatch ? 'Borrando...' : 'Confirmar Borrado'}
                  </button>
                </div>
              </div>
            )}

            {/* Empty State when 0 stickers */}
            {stickers.length === 0 ? (
              <div className="py-12 px-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-white">No hay cromos en el álbum</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Todos los cromos han sido eliminados de Firebase y no se regenerarán automáticamente.
                  Puedes crear nuevos cromos con el formulario o restaurar el catálogo oficial de 40 cromos.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultCatalog}
                    disabled={isDeletingBatch}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restaurar Catálogo Oficial (40 Cromos)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Stickers Grid with Checkbox Selectors */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-2">
                {stickers.map(st => {
                  const isSelected = selectedStickerNumbers.includes(st.number);
                  return (
                    <div
                      key={st.id}
                      className={`relative p-2.5 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
                        isSelected
                          ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/40'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Checkbox Overlay Top-Right */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectSticker(st.number);
                        }}
                        className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                        title={isSelected ? 'Deseleccionar cromo' : 'Seleccionar cromo para borrar'}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="flex items-center justify-between text-[10px] pr-7">
                          <span className="font-mono font-bold text-amber-400">#{st.number}</span>
                          <span className="text-slate-400 uppercase truncate">{st.rarity}</span>
                        </div>
                        <img
                          src={st.imageUrl}
                          alt={st.name}
                          className="w-full h-24 object-cover rounded my-1 border border-slate-800"
                        />
                        <h5 className="font-bold text-xs text-white truncate">{st.name}</h5>
                        <p className="text-[10px] text-slate-400">{st.team}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setEditingSticker(st)}
                          className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSticker(st.number)}
                          disabled={isDeletingBatch}
                          className="text-[10px] text-rose-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Borrar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: Gemini AI Generator */}
      {activeTab === 'ai' && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 space-y-6 shadow-2xl max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-xl text-white">Generador de Cromos con Gemini AI</h3>
              <p className="text-xs text-slate-400">
                Escribe la descripción de un jugador o estadio y Gemini creará las estadísticas y detalles.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Ej. Delantero estrella de Japón con 98 de velocidad"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:border-amber-500 focus:outline-none"
            />

            <button
              onClick={handleGenerateAiSticker}
              disabled={generatingAi || !aiPrompt.trim()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {generatingAi ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Cromo con IA Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Redeem Code Manager */}
      {activeTab === 'codes' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl max-w-xl mx-auto">
          <h3 className="font-display font-extrabold text-lg text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            Crear Nuevo Código Canjeable
          </h3>

          <form onSubmit={handleCreateCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">Nombre del Código (ej. MENUG1011)</label>
              <input
                type="text"
                required
                value={newCodeName}
                onChange={e => setNewCodeName(e.target.value.toUpperCase())}
                placeholder="NUEVOCÓDIGO2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-400 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Sobres de Regalo</label>
                <input
                  type="number"
                  min="0"
                  value={newCodePacks}
                  onChange={e => setNewCodePacks(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-yellow-400 mb-1">Puntos de Regalo</label>
                <input
                  type="number"
                  min="0"
                  value={newCodeCoins}
                  onChange={e => setNewCodeCoins(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-all"
            >
              Publicar Código
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
