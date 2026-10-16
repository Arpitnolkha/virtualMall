'use client';
import { useEffect, useRef } from 'react';
import { useCart } from '@/lib/shopping/CartProvider';
import { products } from '@/lib/mall/products';
import { money } from '@/lib/shopping/cart';

export default function SideCart({ onClose, onCheckout }: { onClose: () => void; onCheckout: () => void }) {
    const cart = useCart();
    const summary = useRef<HTMLElement>(null);
    useEffect(() => {
        const frame = requestAnimationFrame(() => summary.current?.scrollIntoView({ block: 'nearest' }));
        return () => cancelAnimationFrame(frame);
    }, [cart.count]);
    return <section ref={summary} className="shopping-side-cart" aria-label="Your cart">
        <header><h2>Your cart · {cart.count}</h2><button onClick={onClose} aria-label="Hide cart summary">×</button></header>
        <ul>{cart.state.items.map(item => {
            const product = products.find(p => p.id === item.productId)!;
            return <li key={item.productId}><span>{product.name}<small>Quantity {item.quantity} · {money(product.details!.price.amount)} each</small></span><strong>{money(product.details!.price.amount * item.quantity)}</strong></li>;
        })}</ul>
        <footer><span role="status">Subtotal {money(cart.total)}</span><button onClick={onCheckout} disabled={!cart.count}>Review & checkout →</button></footer>
    </section>;
}
