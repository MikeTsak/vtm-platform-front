// Shared by the player inventory and the admin Inventory tab.
// Mirrors the enum on inventory_items.item_type (back/routes/inventory.js).
export const ITEM_TYPES = ['Relic', 'Artifact', 'Blood Magic', 'Weapon', 'Armor', 'Mundane'];

export function itemIcon(itemType) {
  if (['Relic', 'Artifact', 'Blood Magic'].includes(itemType)) return 'diamond';
  if (itemType === 'Weapon') return 'swords';
  if (itemType === 'Armor') return 'shield';
  if (!itemType || itemType === 'Unknown') return 'help_outline';
  return 'backpack';
}
