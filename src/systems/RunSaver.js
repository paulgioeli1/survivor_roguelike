import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Saves a completed run to Firestore's "runs" collection. Fire-and-forget:
// a save failure (offline, rules, quota) is logged but never blocks the
// game-over flow — the player's experience never depends on the network call
// succeeding.
export async function saveRun({ weapon, killCount, elapsedSeconds }) {
  try {
    await addDoc(collection(db, 'runs'), {
      weapon,
      kills: killCount,
      seconds: Math.round(elapsedSeconds),
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[RunSaver] failed to save run:', err);
  }
}
