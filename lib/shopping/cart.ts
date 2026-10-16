import { products } from '@/lib/mall/products';
export const CART_KEY = 'maya-showroom-cart-v1';
export interface CartItem {
    productId: string;
    quantity: number;
    addedAt: number;
}
export interface CartState {
    items: CartItem[];
    actionIds: string[];
}
export const emptyCart: CartState = { items: [], actionIds: [] };
export function validQuantity(n: unknown): n is number { return typeof n === 'number' && Number.isSafeInteger(n) && n >= 1 && n <= 99; }
export function restoreCart(raw: string | null): CartState {
    try {
        const data = JSON.parse(raw ?? '{}');
        const items: CartItem[] = [];
        for (const item of Array.isArray(data.items) ? data.items : []) {
            if (item && typeof item === 'object' && products.some(p => p.id === item.productId && p.details?.price.currency === 'INR') && validQuantity(item.quantity) && !items.some(p => p.productId === item.productId))
                items.push({ productId: item.productId, quantity: item.quantity, addedAt: Number.isFinite(item.addedAt) ? item.addedAt : Date.now() });
        }
        return { items, actionIds: Array.isArray(data.actionIds) ? data.actionIds.filter((s: unknown) => typeof s === 'string').slice(-500) : [] };
    }
    catch {
        return { items: [], actionIds: [] };
    }
}
export function addItem(state: CartState, productId: string, quantity: number, actionId: string): CartState {
    if (state.actionIds.includes(actionId))
        return state;
    if (!products.some(p => p.id === productId && p.details?.price.currency === 'INR') || !validQuantity(quantity))
        throw new Error('Choose a quantity between 1 and 99.');
    const existing = state.items.find(p => p.productId === productId);
    if (existing && !validQuantity(existing.quantity + quantity))
        throw new Error('The maximum is 99 units per product.');
    return { items: existing ? state.items.map(p => p.productId === productId ? { ...p, quantity: p.quantity + quantity } : p) : [...state.items, { productId, quantity, addedAt: Date.now() }], actionIds: [...state.actionIds, actionId].slice(-500) };
}
export function updateQuantity(state: CartState, productId: string, quantity: number): CartState {
    if (!validQuantity(quantity))
        throw new Error('Choose a quantity between 1 and 99.');
    return { ...state, items: state.items.map(p => p.productId === productId ? { ...p, quantity } : p) };
}
export const itemCount = (state: CartState) => state.items.reduce((n, p) => n + p.quantity, 0);
export const cartTotal = (state: CartState) => state.items.reduce((n, p) => n + p.quantity * (products.find(x => x.id === p.productId)?.details?.price.amount ?? 0), 0);
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
