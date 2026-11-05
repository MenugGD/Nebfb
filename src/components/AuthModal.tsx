import React, { useState } from 'react';
import { Shield, KeyRound, User as UserIcon, LogIn, UserPlus, Trophy, Sparkles } from 'lucide-react';
import { loginWithFirestore, registerWithFirestore } from '../services/firebaseService';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: any, token: string) => void;
  isMandatoryScreen?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, isMandatoryScreen = false }) => {
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

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Por favor completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      let userData: any;
      if (isRegister) {
        userData = await registerWithFirestore(cleanUser, password);
      } else {
        userData = await loginWithFirestore(cleanUser, password);
      }

      onSuccess(userData, `token_${userData.id}`);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Error al autenticar');
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
    <div className={`fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto ${
      isMandatoryScreen ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-slate-950/90 backdrop-blur-md'
    }`}>
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 my-auto">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-6 text-slate-950 text-center relative">
          
          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center mx-auto shadow-2xl mb-3">
            <Trophy className="w-9 h-9 text-amber-400" />
          </div>

          <h2 className="font-display text-2xl font-black tracking-tight">
            ÁLBUM MUNDIAL 2026
          </h2>
          <p className="text-xs font-bold text-slate-950/90 mt-0.5">
            {isRegister ? 'Crear Cuenta Obligatoria' : 'Iniciar Sesión para Entrar'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Nombre de Usuario
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ej. MenugDDLC o Golazo2026"
                  className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu clave"
                  className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>REGISTRARME Y ENTRAR AL ÁLBUM</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ENTRAR A MI ÁLBUM</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle between login/register */}
          <div className="text-center text-xs text-slate-400 border-t border-slate-800 pt-4">
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
