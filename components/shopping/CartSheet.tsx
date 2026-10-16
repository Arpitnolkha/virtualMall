'use client';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/shopping/CartProvider';
import { products } from '@/lib/mall/products';
import { money } from '@/lib/shopping/cart';
export function CartContents({ checkout = false, onCheckout, onContinue }: {
    checkout?: boolean;
    onCheckout?: () => void;
    onContinue: () => void;
}) {
    const cart = useCart();
    const [error, setError] = useState(''), [order, setOrder] = useState('');
    const perform = (fn: () => void) => { try {
        fn();
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
    } };
    return <><h1>{checkout ? 'Demo checkout' : 'Your cart'}</h1>
 <p>{checkout ? 'Review your order. No payment will be collected.' : 'Your everyday finds, all in one place.'}</p>
 {!cart.ready ? <p>Loading cart…</p> : cart.state.items.length === 0 ? <p>{order ? `Demo order ${order} confirmed. No real order was placed.` : 'Your cart is empty. Explore a product to get started.'}</p> : <>
 <ul className="cart-items">{cart.state.items.map(item => { const p = products.find(p => p.id === item.productId)!; return <li key={item.productId}><div><strong>{p.name}</strong><small>{money(p.details!.price.amount)} each</small></div><div className="cart-quantity"><button disabled={item.quantity <= 1} aria-label={`Decrease ${p.name} quantity`} onClick={() => perform(() => cart.update(p.id, item.quantity - 1))}>−</button><output aria-label={`${p.name} quantity`}>{item.quantity}</output><button disabled={item.quantity >= 99} aria-label={`Increase ${p.name} quantity`} onClick={() => perform(() => cart.update(p.id, item.quantity + 1))}>+</button></div><strong>{money(p.details!.price.amount * item.quantity)}</strong><button aria-label={`Remove ${p.name}`} onClick={() => perform(() => cart.remove(p.id))}>Remove</button></li>; })}</ul>
 <p className="cart-subtotal"><span>Subtotal</span><strong>{money(cart.total)}</strong></p>
 <small>Illustrative catalog prices. Taxes, shipping and payments are not processed in this demo.</small>
 {checkout ? <button className="commerce-primary" onClick={() => perform(() => { cart.clear(); setOrder(crypto.randomUUID().slice(0, 8)); })}>Place demo order</button> : <button className="commerce-primary" onClick={onCheckout}>Checkout</button>}
 </>}
 {(error || cart.error) && <p role="alert">{error || cart.error}</p>}
 <button onClick={onContinue}>Continue exploring</button></>;
}
export default function CartSheet({ mode, onClose, onCheckout }: {
    mode: 'cart' | 'checkout';
    onClose: () => void;
    onCheckout: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => { const d = dialog.current; d?.showModal(); return () => d?.close(); }, []);
    return <dialog ref={dialog} className="commerce-sheet" onCancel={e => { e.preventDefault(); onClose(); }}><button className="commerce-close" aria-label="Close cart" onClick={onClose}>×</button><CartContents checkout={mode === 'checkout'} onContinue={onClose} onCheckout={onCheckout}/></dialog>;
}
