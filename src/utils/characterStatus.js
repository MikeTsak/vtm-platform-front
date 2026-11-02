// A character whose story has ended (Final Death, left the city, exiled): its
// player may create a new one, and the server retires this one when they do.
// Mirrors isOutOfPlay in back/services/characterRetirement.js.
export const isOutOfPlay = (c) => !!(c && (c.is_deceased || c.is_left || c.is_exiled));

// The notice line for an out-of-play character.
export const outOfPlayReason = (c) =>
  c?.is_deceased ? 'has met Final Death' : c?.is_exiled ? 'has been exiled' : 'has left the city';
