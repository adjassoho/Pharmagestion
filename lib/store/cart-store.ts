import { create } from "zustand";
import { persist } from "zustand/middleware";
import { assertIntegerAmount } from "@/lib/utils";
import { calculateSaleTaxes } from "@/lib/utils/tax-calculator";
import type { Product, Customer } from "@/lib/types";

export interface CartItem {
  product: Product;
  productUnitId?: string;
  quantity: number;
  unitPriceCents: number; // Prix unitaire FCFA entier
  discountCents: number; // Remise sur la ligne
  taxGroup: "A" | "B" | "C" | "D";
  taxRatePercent: number;
  lineTotalCents: number; // (quantity * unitPriceCents) - discountCents
}

export interface CartState {
  items: CartItem[];
  customer: Customer | null;
  paymentMethod: "cash" | "mobile_money" | "card" | "bank_transfer" | "credit" | "mixed";
  amountPaidCents: number;
  globalDiscountCents: number;
  notes: string;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discountCents: number) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: CartState["paymentMethod"]) => void;
  setAmountPaidCents: (amountCents: number) => void;
  setGlobalDiscountCents: (discountCents: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  // Calculs réactifs (Getters)
  getSubtotalCents: () => number;
  getTaxAmountCents: () => number;
  getTotalCents: () => number;
  getChangeCents: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      paymentMethod: "cash",
      amountPaidCents: 0,
      globalDiscountCents: 0,
      notes: "",

      addItem: (product, quantity = 1) => {
        assertIntegerAmount(product.selling_price_cents, `Prix unitaire ${product.name}`);

        // Règle 25 : une vente n'est JAMAIS bloquée par le stock. Un stock nul,
        // négatif ou non renseigné produit un simple avertissement — un produit
        // dont le stock n'est pas suivi doit rester vendable en caisse.
        const availableStock = product.current_stock;
        if (availableStock === undefined || availableStock === null) {
          console.warn(`[STOCK] Quantité non renseignée pour ${product.name} — vente autorisée.`);
        } else if (availableStock <= 0) {
          console.warn(`[STOCK] Stock nul ou négatif pour ${product.name} (${availableStock}) — vente autorisée.`);
        }

        const currentItems = get().items;
        const existingIndex = currentItems.findIndex(
          (i) => i.product.id === product.id
        );

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          const item = updatedItems[existingIndex];
          const newQty = item.quantity + quantity;
          const lineTotal = newQty * item.unitPriceCents - item.discountCents;

          assertIntegerAmount(lineTotal, `Total ligne ${product.name}`);
          updatedItems[existingIndex] = {
            ...item,
            quantity: newQty,
            lineTotalCents: lineTotal,
          };
          set({ items: updatedItems });
        } else {
          const taxRate = product.tax_group === "B" ? 18.0 : 0.0;
          const lineTotal = quantity * product.selling_price_cents;
          assertIntegerAmount(lineTotal, `Total ligne ${product.name}`);

          const newItem: CartItem = {
            product,
            quantity,
            unitPriceCents: product.selling_price_cents,
            discountCents: 0,
            taxGroup: product.tax_group,
            taxRatePercent: taxRate,
            lineTotalCents: lineTotal,
          };

          set({ items: [...currentItems, newItem] });
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const items = get().items.map((item) => {
          if (item.product.id === productId) {
            // Règle 25 : la quantité saisie n'est pas plafonnée au stock connu.
            const availableStock = item.product.current_stock;
            if (availableStock !== undefined && availableStock !== null && quantity > availableStock) {
              console.warn(
                `[STOCK] ${item.product.name} : ${quantity} demandé(s) pour ${availableStock} en stock — vente autorisée.`
              );
            }

            const lineTotal = quantity * item.unitPriceCents - item.discountCents;
            assertIntegerAmount(lineTotal, `Total ligne ${item.product.name}`);
            return {
              ...item,
              quantity,
              lineTotalCents: lineTotal,
            };
          }
          return item;
        });

        set({ items });
      },

      updateItemDiscount: (productId, discountCents) => {
        assertIntegerAmount(discountCents, "Remise ligne FCFA");
        const items = get().items.map((item) => {
          if (item.product.id === productId) {
            const discount = Math.max(0, Math.min(discountCents, item.quantity * item.unitPriceCents));
            const lineTotal = item.quantity * item.unitPriceCents - discount;
            assertIntegerAmount(lineTotal, `Total ligne ${item.product.name}`);
            return {
              ...item,
              discountCents: discount,
              lineTotalCents: lineTotal,
            };
          }
          return item;
        });

        set({ items });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product.id !== productId) });
      },

      setCustomer: (customer) => set({ customer }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setAmountPaidCents: (amountPaidCents) => {
        assertIntegerAmount(amountPaidCents, "Montant payé FCFA");
        set({ amountPaidCents });
      },
      setGlobalDiscountCents: (globalDiscountCents) => {
        assertIntegerAmount(globalDiscountCents, "Remise globale FCFA");
        set({ globalDiscountCents });
      },
      setNotes: (notes) => set({ notes }),

      clearCart: () =>
        set({
          items: [],
          customer: null,
          paymentMethod: "cash",
          amountPaidCents: 0,
          globalDiscountCents: 0,
          notes: "",
        }),

      getSubtotalCents: () => {
        return get().items.reduce((sum, item) => sum + item.lineTotalCents, 0);
      },

      getTaxAmountCents: () => {
        const items = get().items.map((item) => ({
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents,
          taxGroup: item.taxGroup,
          taxRatePercent: item.taxRatePercent,
        }));
        const globalDiscount = get().globalDiscountCents;
        const result = calculateSaleTaxes(items, globalDiscount);
        return result.totalTaxCents;
      },

      getTotalCents: () => {
        const subtotal = get().getSubtotalCents();
        const globalDiscount = get().globalDiscountCents;
        return Math.max(0, subtotal - globalDiscount);
      },

      getChangeCents: () => {
        const total = get().getTotalCents();
        const paid = get().amountPaidCents;
        return Math.max(0, paid - total);
      },
    }),
    {
      name: "obasa_pos_cart_store", // Règle 27 : Persistance locale pour récupérer le panier après panne/rechargement
    }
  )
);
