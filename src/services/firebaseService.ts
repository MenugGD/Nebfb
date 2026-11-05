import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db } from '../firebase';
import { Sticker, User, TradeOffer, RedeemCode } from '../types';
import { CATALOG_STICKERS, CATALOG_CODES } from '../data/stickersCatalog';

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

export const DEFAULT_STICKERS: Sticker[] = CATALOG_STICKERS;

// Initialize Firestore collections safely and synchronize with Vercel/Firebase
export async function initializeFirestoreSeed() {
  try {
    const stickersSnap = await getDocs(collection(db, 'stickers'));
    const existingNumbers = new Set(stickersSnap.docs.map(d => d.data().number));

    // Seed any missing stickers so both local and Vercel have all 40 stickers
    for (const st of CATALOG_STICKERS) {
      if (!existingNumbers.has(st.number)) {
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

  try {
    const codesSnap = await getDocs(collection(db, 'codes'));
    const existingCodes = new Set(codesSnap.docs.map(d => d.data().code));
    for (const c of CATALOG_CODES) {
      if (!existingCodes.has(c.code)) {
        await setDoc(doc(db, 'codes', c.code), c);
      }
    }
  } catch (error) {
    logFirestoreError(error, 'seedCodes');
  }
}

// User Authentication
export async function loginWithFirestore(username: string, pass: string): Promise<User> {
  const cleanUsername = username.trim();
  const isAdmin = cleanUsername.toLowerCase() === 'menugddlc';

  try {
    const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
    let snap = await getDocs(q);

    if (snap.empty && cleanUsername.toLowerCase() === 'menugddlc') {
      const qAdmin = query(collection(db, 'users'), where('username', '==', 'MenugDDLC'));
      snap = await getDocs(qAdmin);
    }

    if (!snap.empty) {
      const docData = snap.docs[0].data() as User;
      return {
        ...docData,
        id: snap.docs[0].id // Use exact Firestore doc ID
      };
    }

    // Auto create profile
    const newUser: User = {
      id: isAdmin ? 'usr_admin' : `usr_${Date.now()}`,
      username: cleanUsername,
      role: isAdmin ? 'admin' : 'user',
      coins: isAdmin ? 5000 : 1000,
      packsCount: isAdmin ? 20 : 10,
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
    return snap.docs.map(doc => doc.data() as Sticker).sort((a, b) => a.number - b.number);
  } catch (error) {
    logFirestoreError(error, 'getStickers');
    return DEFAULT_STICKERS;
  }
}

// Live real-time subscription to stickers catalog
export function subscribeFirestoreStickers(callback: (stickers: Sticker[]) => void) {
  try {
    return onSnapshot(collection(db, 'stickers'), (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => d.data() as Sticker);
        callback(list.sort((a, b) => a.number - b.number));
      } else {
        callback(DEFAULT_STICKERS);
      }
    }, (error) => {
      logFirestoreError(error, 'subscribeStickers');
      callback(DEFAULT_STICKERS);
    });
  } catch (error) {
    logFirestoreError(error, 'subscribeStickersInit');
    callback(DEFAULT_STICKERS);
    return () => {};
  }
}

// Fetch single user by username
export async function getFirestoreUser(username: string): Promise<User | null> {
  try {
    const q = query(collection(db, 'users'), where('username', '==', username.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as User;
    }
  } catch (error) {
    logFirestoreError(error, 'getFirestoreUser');
  }
  return null;
}

// Live real-time subscription to user document changes
export function subscribeFirestoreUser(username: string, callback: (user: User) => void) {
  try {
    const q = query(collection(db, 'users'), where('username', '==', username.trim()));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const u = snapshot.docs[0].data() as User;
        callback(u);
      }
    }, (error) => {
      logFirestoreError(error, 'subscribeUser');
    });
  } catch (error) {
    logFirestoreError(error, 'subscribeUserInit');
    return () => {};
  }
}

// Update User
export async function updateUserInFirestore(user: User): Promise<void> {
  try {
    if (user.id) {
      await setDoc(doc(db, 'users', user.id), { ...user }, { merge: true });
    }
    const q = query(collection(db, 'users'), where('username', '==', user.username));
    const snap = await getDocs(q);
    if (!snap.empty && snap.docs[0].id !== user.id) {
      await setDoc(snap.docs[0].ref, { ...user }, { merge: true });
    }
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

// Create trade offer in Firestore
export async function createFirestoreTrade(trade: TradeOffer): Promise<void> {
  try {
    await setDoc(doc(db, 'trades', trade.id), trade);
  } catch (error) {
    logFirestoreError(error, 'createFirestoreTrade');
  }
}

// Update trade offer in Firestore
export async function updateFirestoreTrade(tradeId: string, updates: Partial<TradeOffer>): Promise<void> {
  try {
    await updateDoc(doc(db, 'trades', tradeId), updates);
  } catch (error) {
    logFirestoreError(error, 'updateFirestoreTrade');
  }
}

// Delete or cancel trade offer in Firestore
export async function deleteFirestoreTrade(tradeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'trades', tradeId));
  } catch (error) {
    logFirestoreError(error, 'deleteFirestoreTrade');
  }
}

// Save or Update Sticker in Firestore
export async function saveStickerToFirestore(sticker: Sticker): Promise<void> {
  try {
    const docId = sticker.id || `cromo_${String(sticker.number).padStart(3, '0')}`;
    const cleanSticker: Sticker = {
      ...sticker,
      id: docId,
      number: Number(sticker.number)
    };
    await setDoc(doc(db, 'stickers', docId), cleanSticker, { merge: true });
  } catch (error) {
    logFirestoreError(error, 'saveStickerToFirestore');
    throw error;
  }
}

// Delete Sticker from Firestore (by number or id)
export async function deleteStickerFromFirestore(stickerNumber: number): Promise<void> {
  try {
    const num = Number(stickerNumber);
    // Find docs with matching number
    const q = query(collection(db, 'stickers'), where('number', '==', num));
    const snap = await getDocs(q);
    const deleteOps = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteOps);

    // Also check standard id patterns
    const candidateIds = [
      `cromo_${num}`,
      `cromo_${String(num).padStart(3, '0')}`
    ];
    for (const cid of candidateIds) {
      try {
        await deleteDoc(doc(db, 'stickers', cid));
      } catch {
        // ignore individual if already deleted
      }
    }
  } catch (error) {
    logFirestoreError(error, 'deleteStickerFromFirestore');
    throw error;
  }
}

// Fetch all registered users from Firestore
export async function getFirestoreUsers(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      return snap.docs.map(d => {
        const data = d.data();
        const { password, ...safeUser } = data as any;
        return safeUser as User;
      });
    }
    return [];
  } catch (error) {
    logFirestoreError(error, 'getFirestoreUsers');
    return [];
  }
}

// Modify user points, packs, or grant duplicate sticker in Firestore
export async function adminModifyUserInFirestore(
  targetUsername: string,
  updates: { coins?: number; packsCount?: number; stickerNumber?: number }
): Promise<User | null> {
  try {
    const q = query(collection(db, 'users'), where('username', '==', targetUsername));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const userDoc = snap.docs[0];
    const data = userDoc.data() as User;

    let updatedCoins = data.coins || 0;
    if (updates.coins !== undefined) {
      updatedCoins = Math.max(0, updatedCoins + updates.coins);
    }

    let updatedPacks = data.packsCount || 0;
    if (updates.packsCount !== undefined) {
      updatedPacks = Math.max(0, updatedPacks + updates.packsCount);
    }

    const updatedDuplicates = { ...(data.duplicates || {}) };
    if (updates.stickerNumber) {
      const stNum = Number(updates.stickerNumber);
      updatedDuplicates[stNum] = (updatedDuplicates[stNum] || 0) + 1;
    }

    const updatedUser: User = {
      ...data,
      coins: updatedCoins,
      packsCount: updatedPacks,
      duplicates: updatedDuplicates
    };

    await setDoc(userDoc.ref, updatedUser, { merge: true });
    return updatedUser;
  } catch (error) {
    logFirestoreError(error, 'adminModifyUserInFirestore');
    return null;
  }
}

// Remove sticker from user's inventory or pasted collection in Firestore
export async function adminRemoveUserSticker(
  targetUsername: string,
  stickerNumber: number
): Promise<User | null> {
  try {
    const q = query(collection(db, 'users'), where('username', '==', targetUsername));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const userDoc = snap.docs[0];
    const data = userDoc.data() as User;
    const stNum = Number(stickerNumber);

    const updatedDuplicates = { ...(data.duplicates || {}) };
    let updatedPasted = [...(data.pastedStickers || [])];

    if (updatedDuplicates[stNum] && updatedDuplicates[stNum] > 0) {
      updatedDuplicates[stNum] -= 1;
      if (updatedDuplicates[stNum] === 0) delete updatedDuplicates[stNum];
    } else if (updatedPasted.includes(stNum)) {
      updatedPasted = updatedPasted.filter(n => n !== stNum);
    }

    const updatedUser: User = {
      ...data,
      duplicates: updatedDuplicates,
      pastedStickers: updatedPasted
    };

    await setDoc(userDoc.ref, updatedUser, { merge: true });
    return updatedUser;
  } catch (error) {
    logFirestoreError(error, 'adminRemoveUserSticker');
    return null;
  }
}

// Promo Codes in Firestore
export async function saveCodeToFirestore(codeData: RedeemCode): Promise<void> {
  try {
    const cleanCode = codeData.code.trim().toUpperCase();
    await setDoc(doc(db, 'codes', cleanCode), {
      ...codeData,
      code: cleanCode
    });
  } catch (error) {
    logFirestoreError(error, 'saveCodeToFirestore');
  }
}

export async function deleteCodeFromFirestore(code: string): Promise<void> {
  try {
    const cleanCode = code.trim().toUpperCase();
    await deleteDoc(doc(db, 'codes', cleanCode));
  } catch (error) {
    logFirestoreError(error, 'deleteCodeFromFirestore');
  }
}

export async function getFirestoreCodes(): Promise<RedeemCode[]> {
  try {
    const snap = await getDocs(collection(db, 'codes'));
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as RedeemCode);
    }
  } catch (error) {
    logFirestoreError(error, 'getFirestoreCodes');
  }
  return [
    {
      code: 'MENUG1011',
      rewardPacks: 10,
      rewardCoins: 500,
      rewardStickerNumber: 1,
      maxUses: 999,
      timesUsed: 0,
      description: 'Código de Administrador MenugDDLC: 10 Sobres + 500 Monedas + Trofeo Mundial'
    },
    {
      code: 'MUNDIAL2026',
      rewardPacks: 5,
      rewardCoins: 300,
      maxUses: 500,
      timesUsed: 0,
      description: 'Bienvenida al Mundial 2026: 5 Sobres + 300 Monedas'
    },
    {
      code: 'SOBREGRATIS',
      rewardPacks: 3,
      rewardCoins: 100,
      maxUses: 1000,
      timesUsed: 0,
      description: 'Sobre gratis para coleccionistas: 3 Sobres'
    },
    {
      code: 'ORO2026',
      rewardPacks: 2,
      rewardCoins: 1000,
      rewardStickerNumber: 17,
      maxUses: 200,
      timesUsed: 0,
      description: 'Premio dorado: 1000 Monedas + Cromo Lamine Yamal Holo'
    }
  ];
}

