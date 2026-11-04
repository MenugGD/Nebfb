import React, { useState } from 'react';
import { User } from '../types';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { KeyRound, Sparkles, CheckCircle2, AlertCircle, Gift, Package, Coins } from 'lucide-react';

interface RedeemViewProps {
  user: User | null;
  onRedeemCode: (code: string) => Promise<any>;
  onOpenAuth: () => void;
}

export const RedeemView: React.FC<RedeemViewProps> = ({ user, onRedeemCode, onOpenAuth }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rewardData, setRewardData] = useState<any | null>(null);

  const sampleCodes = [
    { code: 'MENUG1011', desc: 'Código Admin Especial: 10 Sobres + 500 Monedas + Trofeo Holo' },
    { code: 'MUNDIAL2026', desc: 'Bienvenida 2026: 5 Sobres + 300 Monedas' },
    { code: 'SOBREGRATIS', desc: 'Cobre Regalo: 3 Sobres' },
    { code: 'ORO2026', desc: 'Regalo Dorado: 1000 Monedas + Lamine Yamal Holo' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!code.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setRewardData(null);

    try {
      const res = await onRedeemCode(code.trim());
      sounds.playFanfare();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 }
      });
      setRewardData(res.reward);
      setCode('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Código no válido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <KeyRound className="w-4 h-4" />
          <span>Sistema de Códigos Promocionales</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white">
          Canjear Códigos Especiales
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Introduce un código promocional para desbloquear sobres adicionales, monedas y estampas doradas.
        </p>
      </div>

      {/* Input Box Card */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {errorMsg && (
          <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl text-xs text-rose-300 font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {rewardData && (
          <div className="p-6 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/50 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>¡CÓDIGO CANJEADO CON ÉXITO!</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {rewardData.packs > 0 && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Package className="w-4 h-4" />
                  <span>+{rewardData.packs} Sobres</span>
                </div>
              )}
              {rewardData.coins > 0 && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2 text-xs font-bold text-yellow-400">
                  <Coins className="w-4 h-4" />
                  <span>+{rewardData.coins} Monedas</span>
                </div>
              )}
              {rewardData.bonusSticker && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2 text-xs font-bold text-emerald-400 col-span-2 sm:col-span-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="truncate">Cromo: {rewardData.bonusSticker.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="EJ: MENUG1011 o MUNDIAL2026"
            className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-mono font-bold text-amber-400 uppercase tracking-wider focus:border-amber-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Gift className="w-4 h-4" />
                <span>CANJEAR CÓDIGO</span>
              </>
            )}
          </button>
        </form>

      </div>

      {/* Available Codes List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Códigos Promocionales Disponibles (Haz clic para probar)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sampleCodes.map(c => {
            const isRedeemed = user?.redeemedCodes.includes(c.code);
            return (
              <button
                key={c.code}
                onClick={() => setCode(c.code)}
                disabled={isRedeemed}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                  isRedeemed
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:scale-[1.01]'
                }`}
              >
                <div>
                  <span className="font-mono font-bold text-xs text-amber-400 block">{c.code}</span>
                  <p className="text-[11px] text-slate-400 mt-1">{c.desc}</p>
                </div>
                {isRedeemed ? (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                    Canjeado
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    Usar
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
