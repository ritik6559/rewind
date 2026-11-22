export type CartItem = { name: string; priceCents: number; quantity: number };

export function subtotalCents(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export function applyDiscount(totalCents: number, percent: number): number {
  return Math.round(totalCents - percent);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
