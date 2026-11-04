import React, { useState, useEffect } from 'react';
import { Sticker, User, RedeemCode } from '../types';
import { sounds } from '../utils/audio';
import { Shield, Plus, Gift, Trash2, Edit, Sparkles, Users, KeyRound, Layers, CheckCircle2, AlertCircle, Image as ImageIcon, Upload, Palette, Cpu } from 'lucide-react';

interface AdminPanelProps {
  user: User | null;
  stickers: Sticker[];
  onRefreshData: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, stickers, onRefreshData }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'stickers' | 'codes' | 'ai'>('users');

  // Grant / Take state
  const [targetUser, setTargetUser] = useState<string>('');
  const [grantPacks, setGrantPacks] = useState<number>(5);
  const [grantCoins, setGrantCoins] = useState<number>(500);
  const [grantStickerNum, setGrantStickerNum] = useState<number>(1);
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
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-user': user?.username || '' }
      });
      const data = await res.json();
      if (res.ok) {
        setUsersList(data.users || []);
        if (data.users && data.users.length > 0 && !targetUser) {
          setTargetUser(data.users[0].username);
        }
      }
    } catch {
      // Catch
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

  // File Upload Handlers (from mobile / PC file picker)
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

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user.username
        },
        body: JSON.stringify({
          targetUsername: targetUser,
          packsCount: grantPacks,
          coins: grantCoins,
          stickerNumber: grantStickerNum > 0 ? grantStickerNum : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sounds.playCoin();
      setMsg({ text: `¡Recompensas entregadas con éxito a ${targetUser}!` });
      fetchUsers();
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message, isError: true });
    }
  };

  const handleTakeSticker = async (stickerNumber: number) => {
    setMsg(null);
    try {
      const res = await fetch('/api/admin/take', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user.username
        },
        body: JSON.stringify({
          targetUsername: targetUser,
          stickerNumber
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: `Cromo #${stickerNumber} retirado a ${targetUser}` });
      fetchUsers();
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message, isError: true });
    }
  };

  const handleSaveSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/admin/stickers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user.username
        },
        body: JSON.stringify(editingSticker)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sounds.playCardReveal(true);
      setMsg({ text: `Cromo #${editingSticker.number} (${editingSticker.name}) guardado con fondo y fotos actualizados.` });
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message, isError: true });
    }
  };

  const handleDeleteSticker = async (stNum: number) => {
    if (!confirm(`¿Eliminar cromo #${stNum}?`)) return;
    setMsg(null);
    try {
      const res = await fetch('/api/admin/stickers/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user.username
        },
        body: JSON.stringify({ stickerNumber: stNum })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: `Cromo #${stNum} eliminado.` });
      onRefreshData();
    } catch (err: any) {
      setMsg({ text: err.message, isError: true });
    }
  };

  const handleGenerateAiSticker = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ai/generate-sticker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user.username
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const aiData = data.stickerData;
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
      setMsg({ text: '¡Cromo generado con Inteligencia Artificial Gemini! Puedes adjuntar una foto de tu celular antes de guardar.' });
    } catch (err: any) {
      setMsg({ text: err.message || 'Error con la API Gemini', isError: true });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeName.trim()) return;
    setMsg(null);
    try {
      const res = await fetch('/api/admin/codes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': user.username
        },
        body: JSON.stringify({
          code: newCodeName,
          rewardPacks: newCodePacks,
          rewardCoins: newCodeCoins,
          rewardStickerNumber: newCodeStickerNum > 0 ? newCodeStickerNum : undefined,
          maxUses: newCodeMaxUses,
          description: newCodeDesc || `Código creado por MenugDDLC`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: `Código ${newCodeName.toUpperCase()} creado con éxito.` });
      setNewCodeName('');
      setNewCodeDesc('');
    } catch (err: any) {
      setMsg({ text: err.message, isError: true });
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
              Sube fotos desde tu celular/PC, configura fondos personalizados para estampillas y gestiona el álbum.
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
          Dar / Quitar a Usuarios
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
          
          <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Otorgar Beneficios a Usuario
            </h3>

            <form onSubmit={handleGrantSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Seleccionar Usuario Destino
                </label>
                <select
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  {usersList.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.username} ({u.role}) - {u.pastedStickers?.length || 0} Cromos
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">Cantidad de Sobres a Dar</label>
                <input
                  type="number"
                  min="0"
                  value={grantPacks}
                  onChange={e => setGrantPacks(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-yellow-400 mb-1">Cantidad de Puntos / Monedas a Dar</label>
                <input
                  type="number"
                  min="0"
                  value={grantCoins}
                  onChange={e => setGrantCoins(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">Regalar Cromo Específico (#1 - #{stickers.length})</label>
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

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
              >
                ¡Entregar Recompensas!
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-400" />
              Lista de Coleccionistas Registrados
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Usuario</th>
                    <th className="py-2 px-3">Rol</th>
                    <th className="py-2 px-3">Pegados</th>
                    <th className="py-2 px-3">Sobres</th>
                    <th className="py-2 px-3">Puntos</th>
                    <th className="py-2 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-950/40">
                      <td className="py-2.5 px-3 font-bold text-white">{u.username}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        {u.pastedStickers?.length || 0} / {stickers.length}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{u.packsCount}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-yellow-400">{u.coins}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setTargetUser(u.username);
                            handleTakeSticker(1);
                          }}
                          className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold"
                        >
                          Quitar #1
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Sticker Management & Direct Mobile File Upload & Background Themes */}
      {activeTab === 'stickers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sticker Form */}
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
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Nombre del Jugador / Elemento</label>
                <input
                  type="text"
                  required
                  value={editingSticker.name || ''}
                  onChange={e => setEditingSticker({ ...editingSticker, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              {/* Mobile / PC File Picker for Sticker Photo */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <label className="block text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Subir Foto del Jugador (desde Galería / Celular)</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleStickerPhotoFileUpload}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer w-full"
                />

                {editingSticker.imageUrl && (
                  <div className="flex items-center gap-3 pt-2">
                    <img src={editingSticker.imageUrl} alt="Preview" className="w-12 h-14 object-cover rounded-lg border border-slate-700" />
                    <span className="text-[10px] text-emerald-400 font-bold">✓ Foto seleccionada</span>
                  </div>
                )}
              </div>

              {/* Admin Custom Sticker Background Picker */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <label className="block text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>Fondo de la Estampilla (Admin)</span>
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

                {/* Subir imagen de fondo desde celular */}
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={editingSticker.category || ''}
                    onChange={e => setEditingSticker({ ...editingSticker, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Equipo / País</label>
                  <input
                    type="text"
                    value={editingSticker.team || ''}
                    onChange={e => setEditingSticker({ ...editingSticker, team: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Posición</label>
                  <input
                    type="text"
                    value={editingSticker.position || ''}
                    onChange={e => setEditingSticker({ ...editingSticker, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Rareza</label>
                  <select
                    value={editingSticker.rarity || 'comun'}
                    onChange={e => setEditingSticker({ ...editingSticker, rarity: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="comun">Común</option>
                    <option value="rara">Rara</option>
                    <option value="dorada_holo">Dorada Holo</option>
                  </select>
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

          {/* Stickers List */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="font-display font-extrabold text-base text-white">
              Catálogo de Cromos ({stickers.length})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-2">
              {stickers.map(st => (
                <div key={st.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-amber-400">#{st.number}</span>
                      <span className="text-slate-400 uppercase">{st.rarity}</span>
                    </div>
                    <img src={st.imageUrl} alt={st.name} className="w-full h-24 object-cover rounded my-1 border border-slate-800" />
                    <h5 className="font-bold text-xs text-white truncate">{st.name}</h5>
                    <p className="text-[10px] text-slate-400">{st.team}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => setEditingSticker(st)}
                      className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteSticker(st.number)}
                      className="text-[10px] text-rose-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                Escribe la descripción de un jugador o stadium mítico y Gemini creará las estadísticas y detalles.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Ej. Delantero estrella de Japón con 98 de velocidad o Portero legendario de Paraguay"
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

            <div>
              <label className="block text-xs font-bold text-emerald-400 mb-1">Cromo Garantizado (opcional)</label>
              <select
                value={newCodeStickerNum}
                onChange={e => setNewCodeStickerNum(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value={0}>Ningún cromo en particular</option>
                {stickers.map(s => (
                  <option key={s.number} value={s.number}>
                    #{s.number} - {s.name} ({s.rarity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Límite Máximo de Usos</label>
              <input
                type="number"
                value={newCodeMaxUses}
                onChange={e => setNewCodeMaxUses(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Descripción</label>
              <input
                type="text"
                value={newCodeDesc}
                onChange={e => setNewCodeDesc(e.target.value)}
                placeholder="Premio especial para coleccionistas"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
              />
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
