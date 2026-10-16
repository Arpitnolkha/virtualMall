"use client";
import dynamic from "next/dynamic";
import { readScene, saveScene } from "@/lib/shopping/sceneMemory";
import { useCart } from "@/lib/shopping/CartProvider";
import { useShopping } from "@/lib/shopping/useShopping";
import ShoppingControls from "@/components/shopping/ShoppingControls";
import SideCart from "@/components/shopping/SideCart";
import CartSheet from "@/components/shopping/CartSheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { MallProvider, useMall } from "@/lib/mall/productContext";
import { products } from "@/lib/mall/products";
import { productPrice } from "@/lib/mall/showroom";
import {
  sections as zones,
  type SectionId as ZoneId,
} from "@/lib/mall/showroomSections";

import type { MallProduct } from "@/types/mall";
import ErrorBoundary from "./ErrorBoundary";
import ProductPanel from "./ProductPanel";
import ConversationPanel from "@/components/conversation/ConversationPanel";
import LatencyPanel from "@/components/conversation/LatencyPanel";
const PanoramicShowroom = dynamic(() => import("./PanoramicShowroom"), {
  ssr: false,
});
const ShowroomAvatar = dynamic(() => import("./ShowroomAvatar"), {
  ssr: false,
});
function Experience() {
  const { handleProductSelected, connectVoice, voice, markMallLoaded } =
    useMall();
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);
  const [zone, setZone] = useState<ZoneId>("headphones");
  const [open, setOpen] = useState(false);
  const [mayaHidden, setMayaHidden] = useState(false);
  const cart = useCart();
  const closeShopping = useCallback(() => { setOpen(false); setMayaHidden(true); }, []);
  const shop = useShopping(closeShopping);
  const shoppingSelected = shop.selected;
  const cancelShopping = shop.cancel;
  const welcomePending = useRef(false);
  const welcomeSpoke = useRef(false);
  useEffect(() => {
    if (!welcomePending.current || open) return;
    if (voice.agentSpeaking) {
      welcomeSpoke.current = true;
      return;
    }
    if (!welcomeSpoke.current || voice.phase !== "ready" || voice.autoplayBlocked) return;
    // Wait for a stable end-of-speech state, not the arrival of transcript text.
    const timer = setTimeout(() => {
      if (!welcomePending.current) return;
      welcomePending.current = false;
      setMayaHidden(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [voice.agentSpeaking, voice.phase, voice.autoplayBlocked, open]);
  const [list, setList] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const navigate = useCallback((next: ZoneId) => {
    setZone(next);
    setMapOpen(false);
  }, []);
  const [tab, setTab] = useState<"product" | "conversation">("product");
  const overlay = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const exploreButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const enteredRef = useRef(false);
  useEffect(() => {
    const saved = readScene();
    const frame = requestAnimationFrame(() => {
      if (saved.zone && zones.some(z => z.id === saved.zone)) setZone(saved.zone as ZoneId);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (entered) saveScene({ zone });
  }, [zone, entered]);
  const onReady = useCallback(() => {
    setReady(true);
    markMallLoaded();
  }, [markMallLoaded]);
  const enter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    setEntered(true);
    welcomePending.current = true;
    welcomeSpoke.current = false;
    setMayaHidden(false);
    if (voice.phase === "disconnected") void connectVoice();
  };
  const select = useCallback(
    (p: MallProduct) => {
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      enteredRef.current = true;
      setEntered(true);
      setList(false);
      setMapOpen(false);
      setTab("product");
      welcomePending.current = false;
      setMayaHidden(false);
      shoppingSelected(p.id);
      handleProductSelected(p);
      setOpen(true);
    },
    [handleProductSelected, shoppingSelected],
  );
  const close = useCallback(() => { cancelShopping(); setOpen(false); setMayaHidden(true); }, [cancelShopping]);
  useEffect(() => {
    if (!open) return;
    const fallbackFocus = exploreButton.current;
    const originFocus = returnFocus.current;
    closeButton.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (document.activeElement?.closest("dialog")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        overlay.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], summary, [tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      requestAnimationFrame(() => {
        if (
          originFocus?.isConnected &&
          originFocus.tagName !== "BODY" &&
          originFocus.getClientRects().length
        )
          originFocus.focus();
        else fallbackFocus?.focus();
      });
    };
  }, [open, close]);
  const current = zones.find((z) => z.id === zone)!;
  return (
    <main className="showroom-experience" data-entered={entered}>
      <div className="showroom-world" inert={open}>
        <ErrorBoundary
          fallback={
            <div className="showroom-fallback">
              The room couldn’t render. Explore products below; your
              conversation stays available.
            </div>
          }
        >
          <PanoramicShowroom
            sectionId={zone}
            enabled={entered && !open}
            onSelect={select}
            onReady={onReady}
            onNavigate={navigate}
          />
        </ErrorBoundary>
        <header className="showroom-header">
          <span className="showroom-brand">
            Maya’s <i>✳</i>
          </span>
          <span className="showroom-wordmark">THE EVERYDAY SHOWROOM</span>
          <nav className="showroom-toolbar" aria-label="Showroom controls">
          <button className="section-menu-toggle" hidden={!entered} onClick={() => { setMapOpen(value => !value); setList(false); }} aria-expanded={mapOpen} aria-controls="store-map">Sections <span aria-hidden="true">⌄</span></button>
          <button
            ref={exploreButton}
            onClick={() => { setList((v) => !v); setMapOpen(false); }}
            aria-expanded={list}
            aria-controls="showroom-products"
          >
            Products <span aria-hidden="true">⌄</span>
          </button>
          <button className="cart-button" onClick={() => shop.setSheet('cart')} aria-label={`Cart, ${cart.count} items`}>Cart <span>{cart.count}</span></button>
          </nav>
        </header>
        <div className="zone-caption" aria-live="polite">
          <h1>{current.name}</h1><span>· {zones.indexOf(current) + 1} of {zones.length}</span>
        </div>
        {!entered && (
          <div className="showroom-entry">
            <span className="eyebrow">A PERSONAL SHOPPING EXPERIENCE</span>
            <h2>
              Your showroom.
              <br />
              <em>Your own pace.</em>
            </h2>
            <p>
              Step inside, find something you love, and talk it over with Maya.
            </p>
            <button onClick={enter}>
              Enter showroom <span>↗</span>
            </button>
            <button
              className="browse-silently"
              onClick={() => {
                enteredRef.current = true;
                setEntered(true);
                setMayaHidden(true);
              }}
            >
              Look around first
            </button>
            <small>
              Microphone permission lets you speak to Maya.
              <br />
              You can keep exploring while she connects.
            </small>
            <span className="entry-ready">
              {ready ? "Your showroom is ready" : "Preparing your experience…"}
            </span>
          </div>
        )}
        {mapOpen && (
          <nav
            id="store-map"
            className="store-map"
            aria-label="Store destinations"
          >
            <header>
              <div>
                <span className="eyebrow">FIND YOUR WAY</span>
                <h2>The showroom</h2>
              </div>
              <button
                onClick={() => setMapOpen(false)}
                aria-label="Close store map"
              >
                ×
              </button>
            </header>
            {zones.map((z, i) => (
              <button
                key={z.id}
                onClick={() => navigate(z.id)}
                aria-current={zone === z.id ? "location" : undefined}
              >
                <b>0{i + 1}</b>
                <span>
                  {z.name}
                  <small>{z.note}</small>
                </span>
                <i>↗</i>
              </button>
            ))}
          </nav>
        )}
        {list && (
          <section
            id="showroom-products"
            className="explore-list"
            aria-label="Accessible product collection"
          >
            <header>
              <h2>The collection</h2>
              <button
                onClick={() => {
                  setList(false);
                  exploreButton.current?.focus();
                }}
                aria-label="Close product list"
              >
                ×
              </button>
            </header>
            <p>Choose a find to explore with Maya.</p>
            {products.map((p) => (
              <button key={p.id} onClick={() => select(p)}>
                <span>
                  {p.icon}　{p.name}
                </span>
                <small>{productPrice(p)} ↗</small>
              </button>
            ))}
          </section>
        )}
      </div>
      {/* Persistent subtree: popup visibility changes presentation only. */}
      <div
        ref={overlay}
        className={`product-experience ${open ? "is-open" : "is-docked"} maya-present ${mayaHidden && !open ? "maya-away" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={
          open ? "Product experience with Maya" : "Maya, your showroom guide"
        }
        data-tab={tab}
      >
        <header className="product-experience-header" hidden={!open}>
          <button ref={closeButton} onClick={close}>
            ← Continue exploring
          </button>
          <span>YOUR SHOPKEEPER</span>
          <button onClick={close} aria-label="Close product experience">
            ×
          </button>
        </header>
        <div className="mobile-product-tabs" hidden={!open}>
          <button
            onClick={() => setTab("product")}
            aria-pressed={tab === "product"}
          >
            Product
          </button>
          <button
            onClick={() => setTab("conversation")}
            aria-pressed={tab === "conversation"}
          >
            Talk to Maya
          </button>
        </div>
        <button
          className="maya-presence-toggle"
          hidden={open}
          aria-expanded={!mayaHidden}
          onClick={() => {
            welcomePending.current = false;
            setMayaHidden(value => !value);
            if (mayaHidden && voice.phase === "disconnected") void connectVoice();
          }}
        >
          {mayaHidden ? "Ask Maya" : "Back to browsing ↘"}
        </button>
        <aside className="maya-companion">
          <ShowroomAvatar />
          <ConversationPanel onEnd={() => {
            cancelShopping();
            welcomePending.current = false;
            setOpen(false);
            setMayaHidden(true);
          }} />
          {!open && !mayaHidden && <ShoppingControls shop={shop} />}
        </aside>
        <div className="discovery-details" hidden={!open}>
          <ErrorBoundary
            fallback={
              <p>
                Product details couldn’t render. Your conversation is still
                connected.
              </p>
            }
          >
            {shop.cartVisible && <SideCart onClose={shop.hideCart} onCheckout={() => shop.setSheet("checkout")} />}
            <ProductPanel sectionName={current.name} />
            {open && <ShoppingControls shop={shop} />}
          </ErrorBoundary>
        </div>
      </div>
      {shop.sheet && <CartSheet mode={shop.sheet} onClose={shop.explore} onCheckout={() => shop.setSheet('checkout')} />}
      <div className="showroom-debug">
        <LatencyPanel />
      </div>
    </main>
  );
}
export default function MallExperience() {
  return (
    <MallProvider>
      <Experience />
    </MallProvider>
  );
}
