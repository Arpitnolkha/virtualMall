'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { addItem, CART_KEY, cartTotal, emptyCart, itemCount, updateQuantity, type CartState } from './cart';
interface CartContextValue {
    state: CartState;
    ready: boolean;
    error: string;
    count: number;
    total: number;
    add: (id: string, quantity: number, actionId: string) => void;
    update: (id: string, quantity: number) => void;
    remove: (id: string) => void;
    clear: () => void;
}
const Context = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: {
    children: React.ReactNode;
}) {
    // The root provider preserves the cart during client-side navigation only.
    // A fresh document (including refresh) always starts with an empty cart.
    const [state, setState] = useState(emptyCart);
    const current = useRef(emptyCart);
    const ready = true;
    const error = '';
    useEffect(() => {
        // Remove carts saved by older versions; storage is no longer required.
        try { localStorage.removeItem(CART_KEY); } catch { /* Browsing works without storage. */ }
    }, []);
    const commit = (next: CartState) => {
        current.current = next;
        setState(next);
    };
    return <Context.Provider value={{ state, ready, error, count: itemCount(state), total: cartTotal(state),
            add: (id, q, key) => commit(addItem(current.current, id, q, key)), update: (id, q) => commit(updateQuantity(current.current, id, q)),
            remove: id => commit({ ...current.current, items: current.current.items.filter(p => p.productId !== id) }), clear: () => commit({ ...current.current, items: [] }) }}>{children}</Context.Provider>;
}
export function useCart() { const value = useContext(Context); if (!value)
    throw new Error('CartProvider required'); return value; }
