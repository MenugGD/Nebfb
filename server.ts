import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Generated asset paths as relative URL strings
const TROPHY_IMG = '/src/assets/images/trophy_special_sticker_1793815063715.jpg';

interface StickerData {
  id: string;
  number: number;
  name: string;
  category: string;
  team: string;
  position: string;
  rarity: 'comun' | 'rara' | 'dorada_holo';
  imageUrl: string;
  bgTheme?: 'gold_holo' | 'emerald_stadium' | 'cosmic_purple' | 'ruby_fire' | 'silver_metallic' | 'custom_bg';
  customBgUrl?: string;
  stats?: {
    pace?: number;
    shooting?: number;
    passing?: number;
    dribbling?: number;
    description?: string;
  };
}

interface UserData {
  id: string;
  username: string;
  password: string;
  role: 'user' | 'admin';
  coins: number;
  packsCount: number;
  pastedStickers: number[];
  duplicates: Record<number, number>;
  redeemedCodes: string[];
  createdAt: string;
}

interface TradeOfferData {
  id: string;
  creatorUsername: string;
  offeredStickerNumber: number;
  requestedStickerNumber: number;
  status: 'active' | 'completed' | 'cancelled';
  completedBy?: string;
  createdAt: string;
}

interface RedeemCodeData {
  code: string;
  rewardPacks: number;
  rewardCoins: number;
  rewardStickerNumber?: number;
  maxUses: number;
  timesUsed: number;
  description: string;
}

interface DB {
  stickers: StickerData[];
  users: UserData[];
  trades: TradeOfferData[];
  codes: RedeemCodeData[];
}

const DB_FILE = path.join(process.cwd(), 'data_album_db.json');

// Pre-seeded initial dataset of 40 World Cup stickers
const INITIAL_STICKERS: StickerData[] = [
  // Especiales / Leyendas (#1 - #5)
  {
    id: 'cromo_001',
    number: 1,
    name: 'Trofeo Oficial Copa del Mundo',
    category: 'Especiales / Leyendas',
    team: 'FIFA',
    position: 'Trofeo',
    rarity: 'dorada_holo',
    imageUrl: TROPHY_IMG,
    stats: { description: 'El máximo galardón del fútbol mundial en oro macizo de 18 quilates.' }
  },
  {
    id: 'cromo_002',
    number: 2,
    name: 'Lionel Messi',
    category: 'Especiales / Leyendas',
    team: 'Argentina',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 89, shooting: 94, passing: 96, dribbling: 97, description: 'Leyenda viviente, capitán y campeón del mundo.' }
  },
  {
    id: 'cromo_003',
    number: 3,
    name: 'Cristiano Ronaldo',
    category: 'Especiales / Leyendas',
    team: 'Portugal',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 88, shooting: 95, passing: 81, dribbling: 87, description: 'Máximo goleador histórico del fútbol de selecciones.' }
  },
  {
    id: 'cromo_004',
    number: 4,
    name: 'Kylian Mbappé',
    category: 'Especiales / Leyendas',
    team: 'Francia',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 97, shooting: 91, passing: 84, dribbling: 93, description: 'Velocidad explosiva y letalidad en finales de Copa del Mundo.' }
  },
  {
    id: 'cromo_005',
    number: 5,
    name: 'Escudo FIFA World Cup 2026',
    category: 'Especiales / Leyendas',
    team: 'FIFA',
    position: 'Emblema',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Emblema oficial de la edición trinacional USA, México y Canadá.' }
  },

  // Selección Argentina (#6 - #10)
  {
    id: 'cromo_006',
    number: 6,
    name: 'Escudo AFA Argentina',
    category: 'Argentina',
    team: 'Argentina',
    position: 'Escudo',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Escudo oficial de la Selección Argentina con 3 estrellas.' }
  },
  {
    id: 'cromo_007',
    number: 7,
    name: 'Emiliano Martínez',
    category: 'Argentina',
    team: 'Argentina',
    position: 'Portero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 65, shooting: 30, passing: 78, dribbling: 50, description: 'Especialista en penales y Guante de Oro del Mundial.' }
  },
  {
    id: 'cromo_008',
    number: 8,
    name: 'Rodrigo De Paul',
    category: 'Argentina',
    team: 'Argentina',
    position: 'Mediocampista',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 80, shooting: 78, passing: 86, dribbling: 82, description: 'Motor del mediocampo albiceleste y entrega física total.' }
  },
  {
    id: 'cromo_009',
    number: 9,
    name: 'Julian Álvarez',
    category: 'Argentina',
    team: 'Argentina',
    position: 'Delantero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 89, shooting: 87, passing: 79, dribbling: 86, description: 'La Araña que pica con goles clave en momentos decisivos.' }
  },
  {
    id: 'cromo_010',
    number: 10,
    name: 'Alexis Mac Allister',
    category: 'Argentina',
    team: 'Argentina',
    position: 'Mediocampista',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 77, shooting: 82, passing: 89, dribbling: 84, description: 'Visión táctica y precisión de pase quirúrgica.' }
  },

  // Selección Brasil (#11 - #15)
  {
    id: 'cromo_011',
    number: 11,
    name: 'Escudo CBF Brasil',
    category: 'Brasil',
    team: 'Brasil',
    position: 'Escudo',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Escudo pentacampeón del mundo verdeamarelo.' }
  },
  {
    id: 'cromo_012',
    number: 12,
    name: 'Vinicius Jr.',
    category: 'Brasil',
    team: 'Brasil',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 96, shooting: 88, passing: 83, dribbling: 94, description: 'Magia, desborde endiablado y goles decisivos.' }
  },
  {
    id: 'cromo_013',
    number: 13,
    name: 'Rodrygo Goes',
    category: 'Brasil',
    team: 'Brasil',
    position: 'Delantero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 90, shooting: 85, passing: 82, dribbling: 89, description: 'Talento polivalente en el ataque brasileño.' }
  },
  {
    id: 'cromo_014',
    number: 14,
    name: 'Alisson Becker',
    category: 'Brasil',
    team: 'Brasil',
    position: 'Portero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 62, shooting: 25, passing: 85, dribbling: 55, description: 'Muro bajo palos con reflejos felinos.' }
  },
  {
    id: 'cromo_015',
    number: 15,
    name: 'Bruno Guimarães',
    category: 'Brasil',
    team: 'Brasil',
    position: 'Mediocampista',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 78, shooting: 77, passing: 87, dribbling: 83, description: 'Equilibrio defensivo y creatividad de juego.' }
  },

  // Selección España (#16 - #20)
  {
    id: 'cromo_016',
    number: 16,
    name: 'Escudo RFEF España',
    category: 'España',
    team: 'España',
    position: 'Escudo',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Escudo oficial de La Roja, campeones de la Euro 2024.' }
  },
  {
    id: 'cromo_017',
    number: 17,
    name: 'Lamine Yamal',
    category: 'España',
    team: 'España',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 93, shooting: 84, passing: 88, dribbling: 95, description: 'Prodigio histórico, récord de juventud y descaro mundial.' }
  },
  {
    id: 'cromo_018',
    number: 18,
    name: 'Rodri Hernández',
    category: 'España',
    team: 'España',
    position: 'Mediocampista',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 72, shooting: 82, passing: 94, dribbling: 84, description: 'El metrónomo supremo del fútbol mundial.' }
  },
  {
    id: 'cromo_019',
    number: 19,
    name: 'Pedri González',
    category: 'España',
    team: 'España',
    position: 'Mediocampista',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 81, shooting: 76, passing: 91, dribbling: 90, description: 'Seda con el balón y visión de juego prodigiosa.' }
  },
  {
    id: 'cromo_020',
    number: 20,
    name: 'Nico Williams',
    category: 'España',
    team: 'España',
    position: 'Delantero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 95, shooting: 82, passing: 81, dribbling: 91, description: 'Potencia, vértigo y electricidad por la banda.' }
  },

  // Selección Francia (#21 - #25)
  {
    id: 'cromo_021',
    number: 21,
    name: 'Escudo FFF Francia',
    category: 'Francia',
    team: 'Francia',
    position: 'Escudo',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Escudo de Les Bleus con las dos estrellas mundiales.' }
  },
  {
    id: 'cromo_022',
    number: 22,
    name: 'Antoine Griezmann',
    category: 'Francia',
    team: 'Francia',
    position: 'Mediocampista',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 80, shooting: 86, passing: 90, dribbling: 87, description: 'Cerebro táctico y generador absoluto de juego.' }
  },
  {
    id: 'cromo_023',
    number: 23,
    name: 'Aurélien Tchouaméni',
    category: 'Francia',
    team: 'Francia',
    position: 'Mediocampista',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 78, shooting: 74, passing: 85, dribbling: 80, description: 'Pivote físico dominante y potente disparo lejano.' }
  },
  {
    id: 'cromo_024',
    number: 24,
    name: 'William Saliba',
    category: 'Francia',
    team: 'Francia',
    position: 'Defensa',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 83, shooting: 40, passing: 78, dribbling: 72, description: 'Muralla central imponente y salida limpia.' }
  },
  {
    id: 'cromo_025',
    number: 25,
    name: 'Mike Maignan',
    category: 'Francia',
    team: 'Francia',
    position: 'Portero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 60, shooting: 20, passing: 82, dribbling: 50, description: 'Seguridad bajo los tres palos galos.' }
  },

  // Selección Inglaterra (#26 - #30)
  {
    id: 'cromo_026',
    number: 26,
    name: 'Jude Bellingham',
    category: 'Inglaterra',
    team: 'Inglaterra',
    position: 'Mediocampista',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 85, shooting: 88, passing: 87, dribbling: 90, description: 'Liderazgo, llegada de segunda línea y elegancia.' }
  },
  {
    id: 'cromo_027',
    number: 27,
    name: 'Harry Kane',
    category: 'Inglaterra',
    team: 'Inglaterra',
    position: 'Delantero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 74, shooting: 93, passing: 86, dribbling: 82, description: 'Goleador implacable y creador de juego ofensivo.' }
  },
  {
    id: 'cromo_028',
    number: 28,
    name: 'Phil Foden',
    category: 'Inglaterra',
    team: 'Inglaterra',
    position: 'Mediocampista',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 86, shooting: 86, passing: 89, dribbling: 92, description: 'Control de balón magistral entre líneas.' }
  },
  {
    id: 'cromo_029',
    number: 29,
    name: 'Bukayo Saka',
    category: 'Inglaterra',
    team: 'Inglaterra',
    position: 'Delantero',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 89, shooting: 83, passing: 82, dribbling: 88, description: 'Extremo incisivo con zurda de oro.' }
  },
  {
    id: 'cromo_030',
    number: 30,
    name: 'Declan Rice',
    category: 'Inglaterra',
    team: 'Inglaterra',
    position: 'Mediocampista',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 79, shooting: 72, passing: 84, dribbling: 81, description: 'Pilar de contención y liderazgo en la medular.' }
  },

  // Sedes y Estadios 2026 (#31 - #35)
  {
    id: 'cromo_031',
    number: 31,
    name: 'Estadio Azteca (Ciudad de México)',
    category: 'Sedes 2026',
    team: 'Sedes',
    position: 'Estadio',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Templo mítico que acogerá su tercera Copa del Mundo.' }
  },
  {
    id: 'cromo_032',
    number: 32,
    name: 'MetLife Stadium (Nueva York / NJ)',
    category: 'Sedes 2026',
    team: 'Sedes',
    position: 'Estadio',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Sede confirmada de la gran final del Mundial 2026.' }
  },
  {
    id: 'cromo_033',
    number: 33,
    name: 'BC Place (Vancouver)',
    category: 'Sedes 2026',
    team: 'Sedes',
    position: 'Estadio',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Sede icónica en Canadá con techo retráctil.' }
  },
  {
    id: 'cromo_034',
    number: 34,
    name: 'Estadio Akron (Guadalajara)',
    category: 'Sedes 2026',
    team: 'Sedes',
    position: 'Estadio',
    rarity: 'comun',
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Arquitectura vanguardista mexicana para la fiesta del fútbol.' }
  },
  {
    id: 'cromo_035',
    number: 35,
    name: 'SoFi Stadium (Los Ángeles)',
    category: 'Sedes 2026',
    team: 'Sedes',
    position: 'Estadio',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Superestadio ultra moderno en la costa oeste norteamericana.' }
  },

  // Cromos Especiales Míticos (#36 - #40)
  {
    id: 'cromo_036',
    number: 36,
    name: 'Mascota Oficial 2026',
    category: 'Cromos Especiales',
    team: 'FIFA',
    position: 'Mascota',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Símbolo de unión festiva entre México, Estados Unidos y Canadá.' }
  },
  {
    id: 'cromo_037',
    number: 37,
    name: 'Balón Oficial adidas 2026',
    category: 'Cromos Especiales',
    team: 'FIFA',
    position: 'Balón',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
    stats: { description: 'Balón de alta tecnología aerodinámica para disparos espectaculares.' }
  },
  {
    id: 'cromo_038',
    number: 38,
    name: 'Erling Haaland',
    category: 'Cromos Especiales',
    team: 'Noruega',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 91, shooting: 96, passing: 68, dribbling: 81, description: 'Androide goleador de potencia física incontestable.' }
  },
  {
    id: 'cromo_039',
    number: 39,
    name: 'Federico Valverde',
    category: 'Cromos Especiales',
    team: 'Uruguay',
    position: 'Mediocampista',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 88, shooting: 85, passing: 84, dribbling: 83, description: 'El Halcón uruguayo con misil de larga distancia.' }
  },
  {
    id: 'cromo_040',
    number: 40,
    name: 'Mo Salah',
    category: 'Cromos Especiales',
    team: 'Egipto',
    position: 'Delantero',
    rarity: 'rara',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 90, shooting: 89, passing: 83, dribbling: 89, description: 'Faraón del gol e ídolo africano.' }
  }
];

const INITIAL_USERS: UserData[] = [
  {
    id: 'usr_admin',
    username: 'MenugDDLC',
    password: 'Menug1011',
    role: 'admin',
    coins: 5000,
    packsCount: 15,
    pastedStickers: [1, 2, 4, 6, 12, 17, 26, 31],
    duplicates: { 3: 2, 8: 3, 10: 1, 15: 2, 23: 1, 38: 1 },
    redeemedCodes: ['MENUG1011'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_golazo',
    username: 'GolazoMaster',
    password: 'golazo123',
    role: 'user',
    coins: 1200,
    packsCount: 4,
    pastedStickers: [1, 3, 7, 11, 16, 21, 26],
    duplicates: { 2: 1, 4: 2, 9: 1, 17: 1, 27: 2, 38: 1 },
    redeemedCodes: ['MUNDIAL2026'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_panini',
    username: 'PaniniFan26',
    password: 'panini123',
    role: 'user',
    coins: 800,
    packsCount: 2,
    pastedStickers: [2, 5, 8, 12, 18, 22, 32],
    duplicates: { 1: 1, 19: 2, 20: 1, 28: 1, 31: 1, 37: 1 },
    redeemedCodes: [],
    createdAt: new Date().toISOString()
  }
];

const INITIAL_CODES: RedeemCodeData[] = [
  {
    code: 'MENUG1011',
    rewardPacks: 10,
    rewardCoins: 500,
    rewardStickerNumber: 1,
    maxUses: 999,
    timesUsed: 1,
    description: 'Código de Administrador MenugDDLC: 10 Sobres + 500 Monedas + Trofeo Mundial'
  },
  {
    code: 'MUNDIAL2026',
    rewardPacks: 5,
    rewardCoins: 300,
    maxUses: 500,
    timesUsed: 12,
    description: 'Bienvenida al Mundial 2026: 5 Sobres + 300 Monedas'
  },
  {
    code: 'SOBREGRATIS',
    rewardPacks: 3,
    rewardCoins: 100,
    maxUses: 1000,
    timesUsed: 42,
    description: 'Sobre gratis para coleccionistas: 3 Sobres'
  },
  {
    code: 'ORO2026',
    rewardPacks: 2,
    rewardCoins: 1000,
    rewardStickerNumber: 17,
    maxUses: 200,
    timesUsed: 5,
    description: 'Premio dorado: 1000 Monedas + Cromo Lamine Yamal Holo'
  }
];

const INITIAL_TRADES: TradeOfferData[] = [
  {
    id: 'trd_001',
    creatorUsername: 'GolazoMaster',
    offeredStickerNumber: 2, // Messi
    requestedStickerNumber: 18, // Rodri
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'trd_002',
    creatorUsername: 'PaniniFan26',
    offeredStickerNumber: 37, // Balón Adidas
    requestedStickerNumber: 4, // Mbappé
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

// Helper to load or initialize database
function getDB(): DB {
  if (!fs.existsSync(DB_FILE)) {
    const initial: DB = {
      stickers: INITIAL_STICKERS,
      users: INITIAL_USERS,
      trades: INITIAL_TRADES,
      codes: INITIAL_CODES
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Ensure MenugDDLC exists with admin credentials
    let admin = parsed.users.find((u: UserData) => u.username === 'MenugDDLC');
    if (!admin) {
      admin = INITIAL_USERS[0];
      parsed.users.unshift(admin);
    } else {
      admin.role = 'admin';
      admin.password = 'Menug1011';
    }
    return parsed;
  } catch {
    return {
      stickers: INITIAL_STICKERS,
      users: INITIAL_USERS,
      trades: INITIAL_TRADES,
      codes: INITIAL_CODES
    };
  }
}

function saveDB(db: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// REST API Endpoints

// Authentication
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  const { password: _, ...userWithoutPass } = user;
  return res.json({ user: userWithoutPass, token: `token_${user.id}` });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password || username.trim().length < 3) {
    return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
  }
  const db = getDB();
  const existing = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Ese usuario ya existe.' });
  }

  const isMenugAdmin = username.trim().toLowerCase() === 'menugddlc';
  const newUser: UserData = {
    id: `usr_${Date.now()}`,
    username: username.trim(),
    password: password,
    role: isMenugAdmin ? 'admin' : 'user',
    coins: 500,
    packsCount: 5,
    pastedStickers: [],
    duplicates: {},
    redeemedCodes: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDB(db);

  const { password: _, ...userWithoutPass } = newUser;
  return res.json({ user: userWithoutPass, token: `token_${newUser.id}` });
});

app.get('/api/user/me', (req: Request, res: Response) => {
  const username = req.headers['x-user-name'] as string;
  if (!username) return res.status(401).json({ error: 'No autenticado' });

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { password: _, ...userWithoutPass } = user;
  return res.json({ user: userWithoutPass });
});

// Album & Stickers
app.get('/api/album/stickers', (req: Request, res: Response) => {
  const db = getDB();
  return res.json({ stickers: db.stickers });
});

app.post('/api/album/stick', (req: Request, res: Response) => {
  const { username, stickerNumber } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const stickerNum = Number(stickerNumber);
  const stickerObj = db.stickers.find(s => s.number === stickerNum);
  if (!stickerObj) return res.status(404).json({ error: 'Cromo inexistente' });

  // Check if user already pasted it
  if (user.pastedStickers.includes(stickerNum)) {
    return res.status(400).json({ error: 'Este cromo ya está pegado en tu álbum.' });
  }

  // Check if user has duplicate or available cromo
  const dupCount = user.duplicates[stickerNum] || 0;
  if (dupCount <= 0) {
    return res.status(400).json({ error: 'No tienes este cromo en tu inventario para pegar.' });
  }

  // Consume 1 duplicate & add to pastedStickers
  user.duplicates[stickerNum] = dupCount - 1;
  if (user.duplicates[stickerNum] === 0) {
    delete user.duplicates[stickerNum];
  }
  user.pastedStickers.push(stickerNum);
  user.pastedStickers.sort((a, b) => a - b);

  saveDB(db);

  const { password: _, ...userWithoutPass } = user;
  return res.json({ success: true, user: userWithoutPass, pastedSticker: stickerObj });
});

// Open Booster Pack
app.post('/api/packs/open', (req: Request, res: Response) => {
  const { username } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.packsCount <= 0) {
    return res.status(400).json({ error: 'No tienes sobres disponibles. Canjea un código o compra más en la tienda.' });
  }

  user.packsCount -= 1;

  // Draw 5 stickers with probabilities
  const pulled: StickerData[] = [];
  const allStickers = db.stickers;

  const holos = allStickers.filter(s => s.rarity === 'dorada_holo');
  const raras = allStickers.filter(s => s.rarity === 'rara');
  const comunes = allStickers.filter(s => s.rarity === 'comun');

  for (let i = 0; i < 5; i++) {
    const rand = Math.random();
    let selected: StickerData;
    if (rand < 0.12 && holos.length > 0) { // 12% Holo
      selected = holos[Math.floor(Math.random() * holos.length)];
    } else if (rand < 0.45 && raras.length > 0) { // 33% Rara
      selected = raras[Math.floor(Math.random() * raras.length)];
    } else {
      selected = comunes[Math.floor(Math.random() * comunes.length)];
    }

    pulled.push(selected);

    // Add to user duplicate/inventory
    const currentCount = user.duplicates[selected.number] || 0;
    user.duplicates[selected.number] = currentCount + 1;
  }

  saveDB(db);

  const { password: _, ...userWithoutPass } = user;
  return res.json({ success: true, pulledStickers: pulled, user: userWithoutPass });
});

// Buy Packs with coins
app.post('/api/packs/buy', (req: Request, res: Response) => {
  const { username, amount } = req.body;
  const count = Math.max(1, Number(amount) || 1);
  const costPerPack = 100;
  const totalCost = count * costPerPack;

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.coins < totalCost) {
    return res.status(400).json({ error: `Necesitas ${totalCost} monedas para comprar ${count} sobres. Tienes ${user.coins}.` });
  }

  user.coins -= totalCost;
  user.packsCount += count;

  saveDB(db);

  const { password: _, ...userWithoutPass } = user;
  return res.json({ success: true, user: userWithoutPass, packsAdded: count });
});

// Redeem Codes
app.post('/api/codes/redeem', (req: Request, res: Response) => {
  const { username, code } = req.body;
  if (!code || !code.trim()) return res.status(400).json({ error: 'Ingresa un código válido.' });

  const cleanCode = code.trim().toUpperCase();
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.redeemedCodes.includes(cleanCode)) {
    return res.status(400).json({ error: 'Ya has canjeado este código previamente.' });
  }

  const codeData = db.codes.find(c => c.code === cleanCode);
  if (!codeData) {
    return res.status(404).json({ error: 'Código inválido o expirado.' });
  }

  if (codeData.timesUsed >= codeData.maxUses) {
    return res.status(400).json({ error: 'Este código ha alcanzado su límite máximo de canjes.' });
  }

  // Apply rewards
  user.packsCount += codeData.rewardPacks;
  user.coins += codeData.rewardCoins;
  let bonusSticker: StickerData | undefined = undefined;

  if (codeData.rewardStickerNumber) {
    const st = db.stickers.find(s => s.number === codeData.rewardStickerNumber);
    if (st) {
      bonusSticker = st;
      const count = user.duplicates[st.number] || 0;
      user.duplicates[st.number] = count + 1;
    }
  }

  user.redeemedCodes.push(cleanCode);
  codeData.timesUsed += 1;

  saveDB(db);

  const { password: _, ...userWithoutPass } = user;
  return res.json({
    success: true,
    user: userWithoutPass,
    reward: {
      packs: codeData.rewardPacks,
      coins: codeData.rewardCoins,
      bonusSticker
    }
  });
});

// Trading System
app.get('/api/trades', (req: Request, res: Response) => {
  const db = getDB();
  return res.json({ trades: db.trades });
});

app.post('/api/trades/create', (req: Request, res: Response) => {
  const { username, offeredStickerNumber, requestedStickerNumber } = req.body;
  const offered = Number(offeredStickerNumber);
  const requested = Number(requestedStickerNumber);

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!user.duplicates[offered] || user.duplicates[offered] <= 0) {
    return res.status(400).json({ error: 'No tienes este cromo de intercambio disponible en tus repetidas.' });
  }

  const newTrade: TradeOfferData = {
    id: `trd_${Date.now()}`,
    creatorUsername: user.username,
    offeredStickerNumber: offered,
    requestedStickerNumber: requested,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  db.trades.unshift(newTrade);
  saveDB(db);

  return res.json({ success: true, trade: newTrade });
});

app.post('/api/trades/accept', (req: Request, res: Response) => {
  const { tradeId, username } = req.body;
  const db = getDB();
  const trade = db.trades.find(t => t.id === tradeId);
  if (!trade || trade.status !== 'active') {
    return res.status(400).json({ error: 'Oferta de intercambio no disponible.' });
  }

  const acceptor = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  if (!acceptor) return res.status(404).json({ error: 'Usuario no encontrado.' });

  if (acceptor.username === trade.creatorUsername) {
    return res.status(400).json({ error: 'No puedes aceptar tu propia oferta de intercambio.' });
  }

  const creator = db.users.find(u => u.username === trade.creatorUsername);
  if (!creator) return res.status(404).json({ error: 'El creador del intercambio ya no existe.' });

  // Verify creator has offered sticker
  const creatorOfferedCount = creator.duplicates[trade.offeredStickerNumber] || 0;
  if (creatorOfferedCount <= 0) {
    return res.status(400).json({ error: 'El creador ya no posee el cromo ofrecido en sus repetidas.' });
  }

  // Verify acceptor has requested sticker
  const acceptorReqCount = acceptor.duplicates[trade.requestedStickerNumber] || 0;
  if (acceptorReqCount <= 0) {
    return res.status(400).json({ error: 'No posees el cromo solicitado en tus repetidas para realizar el trueque.' });
  }

  // Execute trade:
  // Creator loses offeredSticker, gains requestedSticker
  creator.duplicates[trade.offeredStickerNumber] -= 1;
  if (creator.duplicates[trade.offeredStickerNumber] === 0) delete creator.duplicates[trade.offeredStickerNumber];
  creator.duplicates[trade.requestedStickerNumber] = (creator.duplicates[trade.requestedStickerNumber] || 0) + 1;

  // Acceptor loses requestedSticker, gains offeredSticker
  acceptor.duplicates[trade.requestedStickerNumber] -= 1;
  if (acceptor.duplicates[trade.requestedStickerNumber] === 0) delete acceptor.duplicates[trade.requestedStickerNumber];
  acceptor.duplicates[trade.offeredStickerNumber] = (acceptor.duplicates[trade.offeredStickerNumber] || 0) + 1;

  trade.status = 'completed';
  trade.completedBy = acceptor.username;

  saveDB(db);

  const { password: _, ...userWithoutPass } = acceptor;
  return res.json({ success: true, trade, user: userWithoutPass });
});

app.post('/api/trades/cancel', (req: Request, res: Response) => {
  const { tradeId, username } = req.body;
  const db = getDB();
  const trade = db.trades.find(t => t.id === tradeId);
  if (!trade) return res.status(404).json({ error: 'Oferta no encontrada.' });

  if (trade.creatorUsername.toLowerCase() !== (username || '').toLowerCase()) {
    return res.status(403).json({ error: 'No puedes cancelar este intercambio.' });
  }

  trade.status = 'cancelled';
  saveDB(db);

  return res.json({ success: true });
});

// Admin API (Restricted to MenugDDLC / admin role)
function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  const adminUsername = req.headers['x-admin-user'] as string;
  const db = getDB();
  const adminUser = db.users.find(u => u.username.toLowerCase() === (adminUsername || '').toLowerCase());
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de Administrador (MenugDDLC).' });
  }
  next();
}

app.get('/api/admin/users', verifyAdmin, (req: Request, res: Response) => {
  const db = getDB();
  const safeUsers = db.users.map(({ password, ...u }) => u);
  return res.json({ users: safeUsers });
});

app.post('/api/admin/grant', verifyAdmin, (req: Request, res: Response) => {
  const { targetUsername, packsCount, coins, stickerNumber } = req.body;
  const db = getDB();
  const target = db.users.find(u => u.username.toLowerCase() === (targetUsername || '').toLowerCase());
  if (!target) return res.status(404).json({ error: 'Usuario destino no encontrado.' });

  if (packsCount !== undefined) {
    target.packsCount = Math.max(0, target.packsCount + Number(packsCount));
  }
  if (coins !== undefined) {
    target.coins = Math.max(0, target.coins + Number(coins));
  }
  if (stickerNumber) {
    const stNum = Number(stickerNumber);
    target.duplicates[stNum] = (target.duplicates[stNum] || 0) + 1;
  }

  saveDB(db);
  const { password: _, ...safeUser } = target;
  return res.json({ success: true, user: safeUser });
});

app.post('/api/admin/take', verifyAdmin, (req: Request, res: Response) => {
  const { targetUsername, stickerNumber } = req.body;
  const db = getDB();
  const target = db.users.find(u => u.username.toLowerCase() === (targetUsername || '').toLowerCase());
  if (!target) return res.status(404).json({ error: 'Usuario destino no encontrado.' });

  const stNum = Number(stickerNumber);
  if (target.duplicates[stNum] && target.duplicates[stNum] > 0) {
    target.duplicates[stNum] -= 1;
    if (target.duplicates[stNum] === 0) delete target.duplicates[stNum];
  } else if (target.pastedStickers.includes(stNum)) {
    target.pastedStickers = target.pastedStickers.filter(n => n !== stNum);
  }

  saveDB(db);
  const { password: _, ...safeUser } = target;
  return res.json({ success: true, user: safeUser });
});

app.post('/api/admin/stickers/save', verifyAdmin, (req: Request, res: Response) => {
  const { id, number, name, category, team, position, rarity, imageUrl, bgTheme, customBgUrl, stats } = req.body;
  const db = getDB();
  const stNum = Number(number);

  let existing = db.stickers.find(s => s.number === stNum || s.id === id);
  if (existing) {
    existing.name = name || existing.name;
    existing.category = category || existing.category;
    existing.team = team || existing.team;
    existing.position = position || existing.position;
    existing.rarity = rarity || existing.rarity;
    existing.imageUrl = imageUrl || existing.imageUrl;
    existing.bgTheme = bgTheme || existing.bgTheme;
    existing.customBgUrl = customBgUrl !== undefined ? customBgUrl : existing.customBgUrl;
    existing.stats = stats || existing.stats;
  } else {
    const newSticker: StickerData = {
      id: `cromo_${Date.now()}`,
      number: stNum || db.stickers.length + 1,
      name: name || 'Nuevo Cromo',
      category: category || 'Especiales / Leyendas',
      team: team || 'Mundial',
      position: position || 'Delantero',
      rarity: rarity || 'comun',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
      bgTheme: bgTheme || 'gold_holo',
      customBgUrl: customBgUrl || '',
      stats: stats || { description: 'Cromo personalizado creado por el Administrador.' }
    };
    db.stickers.push(newSticker);
    db.stickers.sort((a, b) => a.number - b.number);
  }

  saveDB(db);
  return res.json({ success: true, stickers: db.stickers });
});

app.post('/api/admin/stickers/delete', verifyAdmin, (req: Request, res: Response) => {
  const { stickerNumber } = req.body;
  const db = getDB();
  const stNum = Number(stickerNumber);
  db.stickers = db.stickers.filter(s => s.number !== stNum);
  saveDB(db);
  return res.json({ success: true, stickers: db.stickers });
});

app.post('/api/admin/stickers/delete-multiple', verifyAdmin, (req: Request, res: Response) => {
  const { stickerNumbers } = req.body;
  const db = getDB();
  if (Array.isArray(stickerNumbers)) {
    const numSet = new Set(stickerNumbers.map(n => Number(n)));
    db.stickers = db.stickers.filter(s => !numSet.has(s.number));
    saveDB(db);
  }
  return res.json({ success: true, stickers: db.stickers });
});

app.post('/api/admin/stickers/delete-all', verifyAdmin, (_req: Request, res: Response) => {
  const db = getDB();
  db.stickers = [];
  saveDB(db);
  return res.json({ success: true, stickers: [] });
});

app.post('/api/admin/stickers/restore-default', verifyAdmin, (_req: Request, res: Response) => {
  const db = getDB();
  db.stickers = [...INITIAL_STICKERS];
  saveDB(db);
  return res.json({ success: true, stickers: db.stickers });
});

app.post('/api/admin/users/reset', verifyAdmin, (req: Request, res: Response) => {
  const { targetUsername } = req.body;
  const db = getDB();
  const target = db.users.find(u => u.username.toLowerCase() === (targetUsername || '').toLowerCase());
  if (!target) return res.status(404).json({ error: 'Usuario destino no encontrado.' });

  target.coins = 0;
  target.packsCount = 0;
  target.pastedStickers = [];
  target.duplicates = {};
  target.redeemedCodes = [];

  saveDB(db);
  const { password: _, ...safeUser } = target;
  return res.json({ success: true, user: safeUser });
});

app.post('/api/admin/users/reset-all', verifyAdmin, (_req: Request, res: Response) => {
  const db = getDB();
  db.users.forEach(u => {
    const isAdmin = u.username.toLowerCase() === 'menugddlc';
    u.coins = isAdmin ? 5000 : 0;
    u.packsCount = isAdmin ? 20 : 0;
    u.pastedStickers = [];
    u.duplicates = {};
    u.redeemedCodes = [];
  });

  saveDB(db);
  return res.json({ success: true });
});

app.post('/api/admin/codes/create', verifyAdmin, (req: Request, res: Response) => {
  const { code, rewardPacks, rewardCoins, rewardStickerNumber, maxUses, description } = req.body;
  if (!code) return res.status(400).json({ error: 'Escribe el código canjeable.' });

  const cleanCode = code.trim().toUpperCase();
  const db = getDB();
  let existing = db.codes.find(c => c.code === cleanCode);
  if (existing) {
    existing.rewardPacks = Number(rewardPacks) || 0;
    existing.rewardCoins = Number(rewardCoins) || 0;
    existing.rewardStickerNumber = rewardStickerNumber ? Number(rewardStickerNumber) : undefined;
    existing.maxUses = Number(maxUses) || 100;
    existing.description = description || existing.description;
  } else {
    const newCode: RedeemCodeData = {
      code: cleanCode,
      rewardPacks: Number(rewardPacks) || 0,
      rewardCoins: Number(rewardCoins) || 0,
      rewardStickerNumber: rewardStickerNumber ? Number(rewardStickerNumber) : undefined,
      maxUses: Number(maxUses) || 100,
      timesUsed: 0,
      description: description || 'Código creado por el Administrador MenugDDLC'
    };
    db.codes.push(newCode);
  }

  saveDB(db);
  return res.json({ success: true, codes: db.codes });
});

app.post('/api/admin/codes/save', verifyAdmin, (req: Request, res: Response) => {
  const { code, rewardPacks, rewardCoins, rewardStickerNumber, maxUses, description } = req.body;
  if (!code) return res.status(400).json({ error: 'Escribe el código canjeable.' });

  const cleanCode = code.trim().toUpperCase();
  const db = getDB();
  let existing = db.codes.find(c => c.code === cleanCode);
  if (existing) {
    existing.rewardPacks = Number(rewardPacks) || 0;
    existing.rewardCoins = Number(rewardCoins) || 0;
    existing.rewardStickerNumber = rewardStickerNumber ? Number(rewardStickerNumber) : undefined;
    existing.maxUses = Number(maxUses) || 100;
    existing.description = description || existing.description;
  } else {
    const newCode: RedeemCodeData = {
      code: cleanCode,
      rewardPacks: Number(rewardPacks) || 0,
      rewardCoins: Number(rewardCoins) || 0,
      rewardStickerNumber: rewardStickerNumber ? Number(rewardStickerNumber) : undefined,
      maxUses: Number(maxUses) || 100,
      timesUsed: 0,
      description: description || 'Código creado por el Administrador MenugDDLC'
    };
    db.codes.push(newCode);
  }

  saveDB(db);
  return res.json({ success: true, codes: db.codes });
});

app.post('/api/admin/codes/delete', verifyAdmin, (req: Request, res: Response) => {
  const { code } = req.body;
  const db = getDB();
  db.codes = db.codes.filter(c => c.code !== code);
  saveDB(db);
  return res.json({ success: true, codes: db.codes });
});

// Server-Side Gemini API call to auto-generate a sticker card with AI
app.post('/api/ai/generate-sticker', verifyAdmin, async (req: Request, res: Response) => {
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clave GEMINI_API_KEY no configurada en el servidor.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Eres el creador oficial del álbum Panini del Mundial 2026. Genera los datos para un nuevo cromo basado en la petición: "${prompt || 'Jugador revelación del mundial'}".
Responde estrictamente en formato JSON válido con las siguientes claves exactas:
{
  "name": "Nombre de jugador o estadio",
  "category": "Especiales / Leyendas",
  "team": "País o FIFA",
  "position": "Delantero | Mediocampista | Defensa | Portero | Estadio | Trofeo",
  "rarity": "comun | rara | dorada_holo",
  "pace": 88,
  "shooting": 85,
  "passing": 80,
  "dribbling": 87,
  "description": "Una breve descripción poética de 1 frase estilo Panini."
}`
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return res.json({ success: true, stickerData: parsed });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al conectar con Gemini AI';
    return res.status(500).json({ error: errorMsg });
  }
});

// Express Error Handler Middleware for Payload or Route Errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ error: 'La imagen o datos enviados son demasiado grandes. Por favor selecciona una imagen más liviana.' });
  }
  console.error('[Server Error Notice]:', err?.message || err);
  return res.status(err?.status || 500).json({ error: err?.message || 'Error interno del servidor' });
});

// Vite Server Mounting in Dev Mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
