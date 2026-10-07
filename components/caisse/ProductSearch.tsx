"use client";

import React, { useState, useEffect } from "react";
import { Search, Barcode, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { productRepository } from "@/lib/repositories";
import { type Product } from "@/lib/types";
import { useCartStore } from "@/lib/store/cart-store";
import { formatCurrency, cn } from "@/lib/utils";

interface ProductSearchProps {
  organizationId?: string;
}

export function ProductSearch({
  organizationId = "00000000-0000-4000-a000-000000000001",
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const addItemToCart = useCartStore((state) => state.addItem);

  // Charge les produits au démarrage et réagit aux saisies de recherche
  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      try {
        // Assure que le seed initial est présent
        await productRepository.seedInitialProducts(organizationId);
        const results = await productRepository.searchProducts(query, organizationId);
        if (active) {
          setProducts(results);
        }
      } catch (err) {
        console.error("Erreur de recherche produit:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(loadProducts, 100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, organizationId]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Barre de Recherche et Scanner */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, référence (SKU) ou code-barres..."
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:outline-none shadow-xs"
        />
        <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-3.5" />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-3 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Grille de Produits */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-[var(--text-tertiary)]">
            Chargement du catalogue...
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-sm text-[var(--text-tertiary)] space-y-1">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <p>Aucun produit trouvé pour &quot;{query}&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((product) => {
              const stock = product.current_stock ?? 0;
              const isLow = stock > 0 && stock <= product.min_stock_threshold;
              const isOut = stock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    // Règle 25 : le stock n'empêche jamais l'ajout au panier.
                    // Le badge « Rupture » informe déjà visuellement le caissier.
                    if (isOut) {
                      console.warn(
                        `[STOCK] ${product.name} ajouté au panier alors qu'il est en rupture (${stock} en stock).`
                      );
                    }
                    addItemToCart(product, 1);
                  }}
                  className="group flex flex-col justify-between p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--color-primary)] hover:shadow-md transition-all cursor-pointer select-none min-h-[120px]"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-[var(--text-tertiary)] tracking-wider uppercase">
                        {product.reference}
                      </span>
                      {/* Badge de statut Stock (CDC & Maquette OBASA) */}
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--status-out-bg)] text-[var(--status-out-fg)]">
                          Rupture
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--status-low-bg)] text-[var(--status-low-fg)]">
                          Stock faible ({stock})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--status-instock-bg)] text-[var(--status-instock-fg)]">
                          En stock ({stock})
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--color-primary)] transition-colors">
                      {product.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-default)]">
                    <span className="text-sm font-extrabold text-[var(--color-primary)]">
                      {formatCurrency(product.selling_price_cents)}
                    </span>
                    <button
                      className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform"
                      title="Ajouter au panier"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
