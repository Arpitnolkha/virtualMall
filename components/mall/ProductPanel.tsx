import Image from "next/image";
import { useState } from "react";
import productGallery from "@/lib/mall/productGallery.json";
import { useMall } from "@/lib/mall/productContext";
import { productPrice } from "@/lib/mall/showroom";
export default function ProductPanel({
  sectionName,
}: {
  sectionName?: string;
}) {
  const { state, ask } = useMall();
  const [detailView, setDetailView] = useState({ productId: "", index: 0 });
  const p = state.activeProduct;
  if (!p) return null;
  const photos = productGallery[p.id as keyof typeof productGallery];
  const view = detailView.productId === p.id ? detailView.index : 0;
  const photo = photos?.[view] ?? photos?.[0];
  return (
    <section className="product-panel" aria-labelledby="product-title">
      <p className="section-context">
        Exploring {sectionName ?? "the showroom"} with Maya
      </p>

      {photo && (
        <div className="product-gallery">
          <figure className="glass-product-visual product-angle-visual" aria-label={`${p.name}: ${photo.label}`}>
            <Image src={photo.src} alt={`${p.name} — ${photo.label}`} fill sizes="(max-width: 700px) 75vw, 35vw" style={{ objectFit: "contain" }} />
          </figure>
          <div className="product-detail-rail" aria-label="Product views">
            {photos.map((angle, index) => (
              <button key={angle.src} className="product-angle-thumbnail" aria-label={`${p.name}: ${angle.label}`} title={angle.label} aria-pressed={view === index} onClick={() => setDetailView({ productId: p.id, index })}>
                <Image src={angle.src} alt="" fill sizes="100px" style={{ objectFit: "contain" }} />
                <span className="product-angle-label">{angle.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="product-summary-group">
      <div className="product-title-row">
        <h2 id="product-title">{p.name}</h2>
        <strong className="product-price">{productPrice(p)}</strong>
      </div>
      <p className="description">{p.description}</p>
      </div>
      <ul className="features">
        {p.features.slice(0, 3).map((f) => (
          <li key={f}><span className="feature-symbol" aria-hidden="true">✧</span><span>{f}</span></li>
        ))}
      </ul>
      {p.suitableFor && (
        <p className="suitable">
          Made for <strong>{p.suitableFor}</strong>
        </p>
      )}
      {p.details && (
        <details key={p.id} className="product-specs">
          <summary>More product details</summary>
          <dl>
            {Object.entries({
              Material: p.details.materials,
              Durability: p.details.durability,
              Comfort: p.details.comfort,
              ...p.details.specifications,
              Care: p.details.care,
            }).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <h3>Ask Maya about this product</h3>
      <div className="questions">
        {p.suggestedQuestions.slice(0, 4).map((q) => (
          <button key={q} onClick={() => ask(q)}>
            {q}
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {p.details?.catalogStatus === "demo" && <p className="catalog-note">Demo product information · illustrative prices and specifications.</p>}
    </section>
  );
}
