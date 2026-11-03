// A character whose story has ended (Final Death, left the city, exiled): its
// player may create a new one, and the server retires this one when they do.
// Mirrors isOutOfPlay in back/services/characterRetirement.js.
export const isOutOfPlay = (c) => !!(c && (c.is_deceased || c.is_left || c.is_exiled));

const sheetOf = (c) => {
  if (typeof c?.sheet !== 'string') return c?.sheet || {};
  try { return JSON.parse(c.sheet) || {}; } catch { return {}; }
};

// May the player start a new character? Out of play, or a Storyteller allowed
// it for any other reason (Admin > Characters > Allow New Character).
// Mirrors canStartNew in back/services/characterRetirement.js.
export const canStartNew = (c) => isOutOfPlay(c) || sheetOf(c).allow_new_character === true;

// The notice line for a character whose player may start a new one.
export const outOfPlayReason = (c) =>
  c?.is_deceased ? 'has met Final Death'
    : c?.is_exiled ? 'has been exiled'
    : c?.is_left ? 'has left the city'
    : 'is leaving play: the Storytellers have allowed you to start a new character';
