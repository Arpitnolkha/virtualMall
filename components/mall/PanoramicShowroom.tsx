"use client";
import Image from "next/image";
import { readScene, saveScene } from "@/lib/shopping/sceneMemory";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { sections, type SectionId } from "@/lib/mall/showroomSections";
import { products } from "@/lib/mall/products";
import type { MallProduct } from "@/types/mall";

/** Scene and hotspots share one image-sized plane; viewport scroll never changes alignment. */
function PanoramicShowroom({
  sectionId,
  enabled,
  onSelect,
  onReady,
  onNavigate,
}: {
  sectionId: SectionId;
  enabled: boolean;
  onSelect: (product: MallProduct) => void;
  onReady: () => void;
  onNavigate: (id: SectionId) => void;
}) {
  const current = sections.find((s) => s.id === sectionId) ?? sections[0];
  const viewport = useRef<HTMLDivElement>(null);
  const positions = useRef<Record<string, { left: number; top: number }>>(readScene().positions ?? {});
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
    active: boolean;
  } | null>(null);
  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>(() => readScene().zoomLevels ?? {});
  const zoomLevelsRef = useRef<Record<string, number>>(readScene().zoomLevels ?? {});
  useEffect(() => {
    const save = () => saveScene({ positions: positions.current, zoomLevels: zoomLevelsRef.current });
    window.addEventListener('pagehide', save);
    return () => { save(); window.removeEventListener('pagehide', save); };
  }, []);
  const changeZoom = useCallback((next: number, clientX?: number, clientY?: number) => {
    const node = viewport.current;
    const plane = node?.firstElementChild as HTMLElement | null;
    if (!node || !plane) return;
    const previous = zoomLevelsRef.current[sectionId] ?? 1;
    const level = Math.max(1, Math.min(2, next));
    if (level === previous) return;
    const rect = node.getBoundingClientRect();
    const x = clientX === undefined ? node.clientWidth / 2 : clientX - rect.left;
    const y = clientY === undefined ? node.clientHeight / 2 : clientY - rect.top;
    const left = (node.scrollLeft + x) * level / previous - x;
    const top = (node.scrollTop + y) * level / previous - y;
    // Resize the shared image/hotspot plane before applying cursor-anchored scroll.
    plane.style.width = `max(${100 * level}vw, ${233.374 * level}dvh)`;
    node.scrollLeft = left;
    node.scrollTop = top;
    positions.current[sectionId] = {left: node.scrollLeft, top: node.scrollTop};
    zoomLevelsRef.current[sectionId] = level;
    setZoomLevels(v => ({...v, [sectionId]: level}));
  }, [sectionId]);
  useEffect(() => {
    const node = viewport.current;
    if (!node || !enabled) return;
    const wheel = (event: WheelEvent) => {
      // Preserve browser shortcuts and horizontal trackpad scrolling.
      if (event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY) return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      const delta = Math.max(-200, Math.min(200, pixels));
      changeZoom((zoomLevelsRef.current[sectionId] ?? 1) * Math.exp(-delta * 0.0015), event.clientX, event.clientY);
    };
    node.addEventListener("wheel", wheel, {passive: false});
    return () => node.removeEventListener("wheel", wheel);
  }, [enabled, sectionId, changeZoom]);
  const [debug] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debugHotspots") ===
        "true",
  );
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const links = current.neighbors.map((n) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = sections.find((s) => s.id === n.targetId)!.imageSrc;
      document.head.appendChild(link);
      return link;
    });
    const frame = requestAnimationFrame(() => {
      const saved = positions.current[sectionId];
      if (viewport.current) {
        viewport.current.scrollLeft = saved?.left ?? (viewport.current.scrollWidth - viewport.current.clientWidth) / 2;
        viewport.current.scrollTop = saved?.top ?? 0;
      }
    });
    return () => {
      links.forEach((link) => link.remove());
      cancelAnimationFrame(frame);
    };
  }, [current, sectionId]);
  const zoomLevel = zoomLevels[sectionId] ?? 1;
  const zoom = zoomLevel > 1.001;
  return (
    <section
      className="panoramic-showroom"
      aria-label={`${current.name} showroom`}
    >
      <div
        ref={viewport}
        className={`panorama-viewport ${zoom ? "is-zoomed" : ""}`}
        tabIndex={enabled ? 0 : -1}
        aria-label="Showroom image. Scroll to zoom, drag or use arrow keys to look around."
        onScroll={(e) => {
          positions.current[sectionId] = {
            left: e.currentTarget.scrollLeft,
            top: e.currentTarget.scrollTop,
          };
        }}
        onPointerDown={(e) => {
          if (!enabled || e.button !== 0) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: e.currentTarget.scrollLeft,
            top: e.currentTarget.scrollTop,
            moved: false,
            active: true,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d?.active) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (Math.hypot(dx, dy) > 6) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.scrollLeft = d.left - dx;
            e.currentTarget.scrollTop = d.top - dy;
          }
        }}
        onPointerUp={() => {
          if (drag.current) drag.current.active = false;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          if (drag.current) drag.current.active = false;
        }}
        onClickCapture={(e) => {
          if (drag.current?.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
          drag.current = null;
        }}
      >
        <div
          style={{width: `max(${100 * zoomLevel}vw, ${233.374 * zoomLevel}dvh)`}}
          key={current.id}
          className={`panorama-plane ${loaded[current.id] ? "is-loaded" : ""} ${debug ? "debug-hotspots" : ""}`}
        >
          <Image
            src={current.imageSrc}
            alt={`${current.name}: a warm retail interior. Select a highlighted product to explore it with Maya.`}
            width={1916}
            height={821}
            sizes="100vw"
            unoptimized
            loading="eager"
            draggable={false}
            onLoad={() => {
              setLoaded((v) => ({ ...v, [current.id]: true }));
              onReady();
            }}
            onError={() => setFailed((v) => ({ ...v, [current.id]: true }))}
          />
          {loaded[current.id] &&
            current.productHotspots.map((h) => {
              const product = products.find((p) => p.id === h.productId);
              if (!product) return null;
              return (
                <button
                  key={h.id}
                  className="product-hotspot"
                  disabled={!enabled}
                  data-hotspot-id={h.id}
                  aria-label={`Explore ${product.name}`}
                  title={`Explore ${product.name}`}
                  style={{
                    left: `${h.xPercent}%`,
                    top: `${h.yPercent}%`,
                    width: `${h.widthPercent}%`,
                    height: `${h.heightPercent}%`,
                  }}
                  onClick={() => onSelect(product)}
                >
                  <span className="hotspot-dot" aria-hidden="true" />
                  <span className="hotspot-label">
                    {product.name} · Explore
                  </span>
                  {debug && (
                    <span className="hotspot-debug-label">
                      {h.id} / {h.productId}
                      <br />
                      {h.xPercent}, {h.yPercent} · {h.widthPercent} ×{" "}
                      {h.heightPercent}%
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
      {failed[current.id] && (
        <p className="panorama-status" role="alert">
          This scene could not load. Use Explore products or move to another
          section.
        </p>
      )}
      {!loaded[current.id] && !failed[current.id] && (
        <p className="panorama-status" role="status">
          Opening {current.name}…
        </p>
      )}
      <div className="panorama-tools">
        <button
          aria-label={zoom ? "Reset zoom" : "Zoom closer"}
          title={zoom ? "Reset zoom" : "Zoom closer"}
          disabled={!enabled}
          onClick={() =>
            changeZoom(zoom ? 1 : 1.25)
          }
        >
          {zoom ? "−" : "+"}
        </button>
        <span>
          {zoom
            ? "Scroll to zoom · Drag to explore"
            : "Scroll to zoom · Drag to look around"}
        </span>
      </div>
      <nav className="panorama-arrows" aria-label="Adjacent showroom sections">
        {current.neighbors.map((n) => (
          <button
            key={n.targetId}
            disabled={!enabled}
            onClick={() => onNavigate(n.targetId)}
            aria-label={`Go to ${n.label}`}
          >
            <span className="floor-arrow" aria-hidden="true">{n.direction === "left" ? "↖" : "↗"}</span>
            <span className="floor-destination">{n.label}</span>
          </button>
        ))}
      </nav>
      {debug && (
        <output className="panorama-debug-section">
          Section: {current.id} · hotspot centers and sizes are image
          percentages
        </output>
      )}
    </section>
  );
}
export default memo(PanoramicShowroom);
