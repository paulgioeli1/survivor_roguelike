import { logEvent } from 'firebase/analytics';
import { analyticsReady } from '../config/firebase.js';

// Thin GA4 wrapper. Every call is fire-and-forget and silently no-ops if
// analytics isn't available (unsupported browser, ad blocker, offline) so a
// failed/missing analytics call can never break gameplay.
function send(eventName, params) {
  analyticsReady
    .then((analytics) => {
      if (analytics) logEvent(analytics, eventName, params);
    })
    .catch(() => {});
}

export const Analytics = {
  gameStart(weapon) {
    send('game_start', { weapon });
  },
  gameOver(weapon, killCount, elapsedSeconds) {
    send('game_over', { weapon, kills: killCount, seconds: Math.round(elapsedSeconds) });
  }
};
