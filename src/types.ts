export type StickerRarity = 'comun' | 'rara' | 'dorada_holo';

export interface Sticker {
  id: string;
  number: number;
  name: string;
  category: string;
  team: string;
  position: string;
  rarity: StickerRarity;
  imageUrl: string;
  bgTheme?: string;
  customBgUrl?: string;
  stats?: {
    pace?: number;
    shooting?: number;
    passing?: number;
    dribbling?: number;
    description?: string;
  };
}

export interface User {
  id: string;
  username: string;
  role: 'user' | 'admin';
  coins: number;
  packsCount: number;
  pastedStickers: number[]; // array of sticker numbers
  duplicates: Record<number, number>; // stickerNumber -> count
  redeemedCodes: string[];
  avatarUrl?: string;
  createdAt: string;
}

export interface TradeOffer {
  id: string;
  creatorUsername: string;
  offeredStickerNumber: number;
  requestedStickerNumber: number;
  status: 'active' | 'completed' | 'cancelled';
  completedBy?: string;
  createdAt: string;
}

export interface RedeemCode {
  code: string;
  rewardPacks: number;
  rewardCoins: number;
  rewardStickerNumber?: number;
  maxUses: number;
  timesUsed: number;
  description: string;
}

export interface UserProgress {
  totalStickers: number;
  pastedCount: number;
  percentage: number;
  totalDuplicates: number;
}
