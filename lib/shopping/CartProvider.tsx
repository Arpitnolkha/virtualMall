'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { addItem, CART_KEY, cartTotal, emptyCart, itemCount, restoreCart, updateQuantity, type CartState } from './cart';
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
    const [state, setState] = useState(emptyCart), [ready, setReady] = useState(false), [error, setError] = useState('');
    const current = useRef(emptyCart);
    useEffect(() => {
        const load = () => { try {
            current.current = restoreCart(localStorage.getItem(CART_KEY));
            setState(current.current);
        }
        catch {
            setError('Cart storage is unavailable. Please allow local storage.');
        } setReady(true); };
        load();
        const changed = (event: StorageEvent) => { if (event.key === CART_KEY)
            load(); };
        window.addEventListener('storage', changed);
        return () => window.removeEventListener('storage', changed);
    }, []);
    const commit = (next: CartState) => {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(next));
            current.current = next;
            setState(next);
            setError('');
        }
        catch {
            setError('Your cart could not be saved. Please allow local storage and try again.');
            throw new Error('Cart could not be saved.');
        }
    };
    return <Context.Provider value={{ state, ready, error, count: itemCount(state), total: cartTotal(state),
            add: (id, q, key) => commit(addItem(current.current, id, q, key)), update: (id, q) => commit(updateQuantity(current.current, id, q)),
            remove: id => commit({ ...current.current, items: current.current.items.filter(p => p.productId !== id) }), clear: () => commit({ ...current.current, items: [] }) }}>{children}</Context.Provider>;
}
export function useCart() { const value = useContext(Context); if (!value)
    throw new Error('CartProvider required'); return value; }
