import { products } from "@/lib/mall/products";
import { useMall } from "@/lib/mall/productContext";
export default function MallHUD() {
  const { state, handleProductSelected } = useMall();
  return (
    <details className="browse-products" open>
      <summary>
        Browse Products <span>THE COLLECTION · 08</span>
      </summary>
      <div className="product-list" aria-label="Browse products">
        {products.map((p, i) => (
          <button
            key={p.id}
            aria-pressed={state.activeProduct?.id === p.id}
            onClick={() => handleProductSelected(p)}
          >
            <span className="item-number">0{i + 1}</span>
            <span
              className="item-icon"
              style={{ background: p.color }}
              aria-hidden="true"
            >
              {p.icon}
            </span>
            <span>
              {p.name}
              <small>{p.category}</small>
            </span>
            <span className="selection-mark" aria-hidden="true">
              {state.activeProduct?.id === p.id ? "✓" : "↗"}
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}
