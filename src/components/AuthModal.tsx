import React, { useState } from 'react';
import { Shield, KeyRound, User as UserIcon, LogIn, UserPlus, Sparkles, X, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error');
      }

      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPreset = () => {
    setUsername('MenugDDLC');
    setPassword('Menug1011');
    setIsRegister(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-6 text-slate-950 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950/20 text-slate-950 hover:bg-slate-950/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight">
                {isRegister ? 'Crear Cuenta de Coleccionista' : 'Acceso a tu Álbum'}
              </h2>
              <p className="text-xs font-semibold text-slate-900/80">
                Mundial 2026 - Edición Digital Panini
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Quick Admin Shortcut Box */}
          <div className="mb-6 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-rose-200 block">Acceso Admin Preconfigurado</span>
                <span className="text-[11px] text-rose-300/80">MenugDDLC / Menug1011</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAdminPreset}
              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors whitespace-nowrap shadow"
            >
              Autocompletar Admin
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre de Usuario
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ej. MenugDDLC o Golazo2026"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu clave"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Registrarme y recibir 5 sobres
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar a Mi Álbum
                </>
              )}
            </button>
          </form>

          {/* Toggle between login/register */}
          <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
            {isRegister ? (
              <span>
                ¿Ya tienes cuenta?{' '}
                <button
                  onClick={() => { setIsRegister(false); setError(null); }}
                  className="text-amber-400 font-bold hover:underline"
                >
                  Inicia sesión aquí
                </button>
              </span>
            ) : (
              <span>
                ¿No tienes cuenta?{' '}
                <button
                  onClick={() => { setIsRegister(true); setError(null); }}
                  className="text-amber-400 font-bold hover:underline"
                >
                  Regístrate gratis
                </button>
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
