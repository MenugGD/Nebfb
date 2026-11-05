import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db } from '../firebase';
import { Sticker, User, TradeOffer } from '../types';

// Safe Logger without crashing the App
function logFirestoreError(error: unknown, action: string) {
  console.warn(`[Firestore ${action} Notice]:`, error instanceof Error ? error.message : String(error));
}

// Test Firestore Connection
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Graceful silent check
  }
}

// Initial Seed Data
const DEFAULT_STICKERS: Sticker[] = [
  {
    id: 'cromo_001',
    number: 1,
    name: 'Trofeo Oficial Copa del Mundo',
    category: 'Especiales / Leyendas',
    team: 'FIFA',
    position: 'Trofeo',
    rarity: 'dorada_holo',
    imageUrl: '/src/assets/images/trophy_special_sticker_1793815063715.jpg',
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
    id: 'cromo_017',
    number: 17,
    name: 'Lamine Yamal',
    category: 'España',
    team: 'España',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 93, shooting: 84, passing: 88, dribbling: 95, description: 'Prodigio histórico y descaro mundial.' }
  },
  {
    id: 'cromo_026',
    number: 26,
    name: 'Jude Bellingham',
    category: 'Inglaterra',
    team: 'Inglaterra',
    position: 'Mediocampista',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 85, shooting: 88, passing: 87, dribbling: 90, description: 'Liderazgo y llegada de segunda línea.' }
  },
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
    id: 'cromo_038',
    number: 38,
    name: 'Erling Haaland',
    category: 'Cromos Especiales',
    team: 'Noruega',
    position: 'Delantero',
    rarity: 'dorada_holo',
    imageUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=400&q=80',
    stats: { pace: 91, shooting: 96, passing: 68, dribbling: 81, description: 'Androide goleador de potencia física incontestable.' }
  }
];

// Initialize Firestore collections safely
export async function initializeFirestoreSeed() {
  try {
    const stickersSnap = await getDocs(collection(db, 'stickers'));
    if (stickersSnap.empty) {
      for (const st of DEFAULT_STICKERS) {
        await setDoc(doc(db, 'stickers', st.id), st);
      }
    }
  } catch (error) {
    logFirestoreError(error, 'seedStickers');
  }

  try {
    const adminQuery = query(collection(db, 'users'), where('username', '==', 'MenugDDLC'));
    const adminSnap = await getDocs(adminQuery);
    if (adminSnap.empty) {
      const adminUser: User = {
        id: 'usr_admin',
        username: 'MenugDDLC',
        role: 'admin',
        coins: 5000,
        packsCount: 20,
        pastedStickers: [1, 2, 4, 6, 12, 17, 26, 31],
        duplicates: { 3: 2, 5: 1, 38: 1 },
        redeemedCodes: ['MENUG1011'],
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', 'usr_admin'), {
        ...adminUser,
        password: 'Menug1011'
      });
    }
  } catch (error) {
    logFirestoreError(error, 'seedAdmin');
  }
}

// User Authentication
export async function loginWithFirestore(username: string, pass: string): Promise<User> {
  const cleanUsername = username.trim();
  const isAdmin = cleanUsername.toLowerCase() === 'menugddlc';

  try {
    const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return snap.docs[0].data() as User;
    }

    // Auto create profile
    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      role: isAdmin ? 'admin' : 'user',
      coins: 1000,
      packsCount: 10,
      pastedStickers: [1, 2, 4],
      duplicates: { 2: 1, 3: 2, 5: 1 },
      redeemedCodes: [],
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', newUser.id), {
      ...newUser,
      password: pass
    });
    return newUser;
  } catch (error) {
    logFirestoreError(error, 'loginUser');
    // Fallback local user object
    return {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      role: isAdmin ? 'admin' : 'user',
      coins: 1000,
      packsCount: 10,
      pastedStickers: [1, 2, 4],
      duplicates: { 2: 1, 3: 2 },
      redeemedCodes: [],
      createdAt: new Date().toISOString()
    };
  }
}

export async function registerWithFirestore(username: string, pass: string): Promise<User> {
  const cleanUsername = username.trim();
  const isAdmin = cleanUsername.toLowerCase() === 'menugddlc';

  const newUser: User = {
    id: `usr_${Date.now()}`,
    username: cleanUsername,
    role: isAdmin ? 'admin' : 'user',
    coins: 500,
    packsCount: 5,
    pastedStickers: [],
    duplicates: {},
    redeemedCodes: [],
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'users', newUser.id), {
      ...newUser,
      password: pass
    });
  } catch (error) {
    logFirestoreError(error, 'registerUser');
  }

  return newUser;
}

// Fetch Stickers
export async function getFirestoreStickers(): Promise<Sticker[]> {
  try {
    const snap = await getDocs(collection(db, 'stickers'));
    if (snap.empty) return DEFAULT_STICKERS;
    return snap.docs.map(doc => doc.data() as Sticker);
  } catch (error) {
    logFirestoreError(error, 'getStickers');
    return DEFAULT_STICKERS;
  }
}

// Update User
export async function updateUserInFirestore(user: User): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), { ...user }, { merge: true });
  } catch (error) {
    logFirestoreError(error, 'updateUser');
  }
}

// Subscribe to Trades
export function subscribeFirestoreTrades(callback: (trades: TradeOffer[]) => void) {
  try {
    return onSnapshot(collection(db, 'trades'), (snapshot) => {
      const tradesList = snapshot.docs.map(d => d.data() as TradeOffer);
      callback(tradesList);
    }, (error) => {
      logFirestoreError(error, 'subscribeTrades');
    });
  } catch (error) {
    logFirestoreError(error, 'subscribeTradesInit');
    return () => {};
  }
}
