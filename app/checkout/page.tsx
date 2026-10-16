'use client';
import { useRouter } from 'next/navigation';
import { CartContents } from '@/components/shopping/CartSheet';
export default function Checkout() { const router = useRouter(); return <main className="commerce-page"><section className="commerce-card"><CartContents checkout onContinue={() => router.push('/mall')}/></section></main>; }
