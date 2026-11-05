import { Sticker } from '../types';

export interface CardThemePreset {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  backgroundCss: string;
}

export const CARD_THEME_PRESETS: CardThemePreset[] = [
  {
    id: 'gold_holo',
    name: 'Arena Dorada de Campeones',
    category: 'Mundial Especial',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80',
    borderColor: 'border-amber-400',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-slate-950 font-black',
    backgroundCss: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.1) 50%, rgba(217, 119, 6, 0.2) 100%), url(https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80)'
  },
  {
    id: 'emerald_stadium',
    name: 'Estadio Césped Nocturno',
    category: 'Fútbol Clásico',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    borderColor: 'border-emerald-500',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-slate-950 font-black',
    backgroundCss: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.1) 50%, rgba(4, 120, 87, 0.2) 100%), url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80)'
  },
  {
    id: 'cosmic_purple',
    name: 'Galaxia Cósmica Estelar',
    category: 'Futurista',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    borderColor: 'border-purple-400',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white font-bold',
    backgroundCss: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(126, 34, 206, 0.2) 100%), url(https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80)'
  },
  {
    id: 'ruby_fire',
    name: 'Fuego Rubí y Volcán',
    category: 'Intensidad',
    imageUrl: 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?auto=format&fit=crop&w=600&q=80',
    borderColor: 'border-rose-500',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white font-bold',
    backgroundCss: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(225, 29, 72, 0.1) 50%, rgba(190, 18, 60, 0.2) 100%), url(https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?auto=format&fit=crop&w=600&q=80)'
  },
  {
    id: 'silver_metallic',
    name: 'Plata Glacial y Acero',
    category: 'Metalizado',
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=600&q=80',
    borderColor: 'border-slate-300',
    badgeBg: 'bg-slate-300',
    badgeText: 'text-slate-900 font-bold',
    backgroundCss: 'linear-gradient(135deg, rgba(203, 213, 225, 0.3) 0%, rgba(148, 163, 184, 0.15) 50%, rgba(100, 116, 139, 0.2) 100%), url(https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=600&q=80)'
  },
  {
    id: 'cyber_stadium',
    name: 'Estadio Neón Cibernético',
    category: 'Cyberpunk',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    borderColor: 'border-cyan-400',
    badgeBg: 'bg-cyan-500',
    badgeText: 'text-slate-950 font-black',
    backgroundCss: 'linear-gradient(135deg, rgba(34, 211, 238, 0.25) 0%, rgba(6, 182, 212, 0.1) 50%, rgba(14, 116, 144, 0.2) 100%), url(https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80)'
  },
  {
    id: 'maracana_green',
    name: 'Maracaná Carnaval Tropical',
    category: 'Latinoamérica',
    imageUrl: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=600&q=80',
    borderColor: 'border-lime-400',
    badgeBg: 'bg-lime-500',
    badgeText: 'text-slate-950 font-black',
    backgroundCss: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(34, 197, 94, 0.1) 50%, rgba(21, 128, 61, 0.2) 100%), url(https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=600&q=80)'
  }
];

export function getCardThemeStyle(sticker?: Partial<Sticker> | null): React.CSSProperties {
  if (!sticker) return {};

  // 1. Custom uploaded background image (bright and clean without dark overlay)
  if (sticker.customBgUrl && sticker.customBgUrl.trim().length > 0) {
    return {
      backgroundImage: `url(${sticker.customBgUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }

  // 2. Preset theme with image
  const preset = CARD_THEME_PRESETS.find(p => p.id === sticker.bgTheme);
  if (preset) {
    return {
      backgroundImage: preset.backgroundCss,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }

  // Fallbacks for legacy theme names
  if (sticker.bgTheme === 'emerald_stadium') {
    return {
      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
    };
  }
  if (sticker.bgTheme === 'cosmic_purple') {
    return {
      background: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)'
    };
  }
  if (sticker.bgTheme === 'ruby_fire') {
    return {
      background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'
    };
  }
  if (sticker.bgTheme === 'silver_metallic') {
    return {
      background: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)'
    };
  }

  // Default gold_holo
  return {
    backgroundImage: CARD_THEME_PRESETS[0].backgroundCss,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
}
