import { z } from "zod";

/**
 * Schémas Zod partagés pour la validation des données Obasa.
 * Règle 15 / P1-04 : Utiliser des schémas Zod partagés pour valider
 * les écritures locales, les formulaires, les API et les données synchronisées.
 */

// === Énumérations ===

export const TaxGroupSchema = z.enum(["A", "B", "C", "D"]);
export const SaleStatusSchema = z.enum(["draft", "completed", "voided", "refunded"]);
export const SyncStatusSchema = z.enum(["pending", "synced", "error", "conflict"]);
export const MecefStatusSchema = z.enum(["pending_fiscal", "submitted", "confirmed", "error_temporary", "error_permanent"]);
export const PaymentMethodSchema = z.enum(["cash", "mobile_money", "card", "bank_transfer", "credit", "mixed"]);
export const MovementTypeSchema = z.enum([
  "initial",
  "purchase",
  "purchase_entry",
  "sale",
  "sale_exit",
  "transfer_in",
  "transfer_out",
  "adjustment_plus",
  "adjustment_minus",
  "return_in",
  "return_out",
  "inventory_adjustment",
  "loss",
  "return_supplier",
  "return_customer",
]);

// === Utilitaires FCFA ===

/** Valide qu'un montant est un entier FCFA strict (Règle 2/R23). */
export const FcfaIntegerSchema = z.number().int({
  message: "[RÈGLE 2 VIOLÉE] Le montant FCFA doit être un entier, pas un décimal.",
});

/** Valide qu'un montant est un entier FCFA positif ou nul. */
export const FcfaPositiveSchema = FcfaIntegerSchema.nonnegative({
  message: "Le montant FCFA doit être positif ou nul.",
});

// === Produit ===

export const ProductSchema = z.object({
  id: z.string().min(1, "L'identifiant du produit est obligatoire."),
  organization_id: z.string().min(1, "L'organisation est obligatoire."),
  category_id: z.string().optional(),
  category_name: z.string().optional(),
  name: z.string().min(1, "Le nom du produit est obligatoire."),
  slug: z.string().min(1),
  reference: z.string().min(1, "La référence (SKU) est obligatoire."),
  barcode: z.string().optional(),
  description: z.string().optional(),
  purchase_price_cents: FcfaPositiveSchema.optional().default(0),
  selling_price_cents: FcfaPositiveSchema,
  tax_group: TaxGroupSchema.default("B"),
  photo_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  min_stock_threshold: z.number().int().nonnegative().optional().default(5),
  min_stock_alert: z.number().int().nonnegative().optional(),
  current_stock: z.number().int().optional(),
  is_active: z.boolean().default(true),
  updated_at: z.string().optional(),
});

export const SaveProductSchema = z.object({
  id: z.string().min(1, "L'identifiant est obligatoire."),
  organization_id: z.string().min(1, "L'organisation est obligatoire."),
  name: z.string().min(1, "Le nom du produit est obligatoire."),
  reference: z.string().min(1, "La référence (SKU) est obligatoire."),
  selling_price_cents: FcfaPositiveSchema,
  purchase_price_cents: FcfaPositiveSchema.optional().default(0),
  tax_group: TaxGroupSchema.optional().default("B"),
  category_name: z.string().optional(),
  category_id: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  min_stock_threshold: z.number().int().nonnegative().optional().default(5),
  min_stock_alert: z.number().int().nonnegative().optional(),
  current_stock: z.number().int().optional(),
  photo_url: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

// === Client ===

export const CustomerSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  name: z.string().min(1, "Le nom du client est obligatoire."),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  ifu: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  total_purchases_cents: FcfaPositiveSchema.default(0),
  is_active: z.boolean().default(true),
});

export const CreateCustomerSchema = z.object({
  organizationId: z.string().min(1, "L'organisation est obligatoire."),
  name: z.string().min(1, "Le nom est obligatoire."),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  ifu: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// === Ligne de Vente (Snapshot — Règle 4/R24) ===

export const SaleItemSchema = z.object({
  id: z.string().min(1),
  sale_id: z.string().min(1),
  product_id: z.string().min(1),
  product_unit_id: z.string().optional().nullable(),
  quantity: z.number().int().positive("La quantité doit être supérieure à 0."),
  unit_price_cents: FcfaIntegerSchema, // SNAPSHOT
  product_name: z.string().min(1), // SNAPSHOT
  product_reference: z.string().optional(), // SNAPSHOT
  tax_group: TaxGroupSchema,
  tax_rate_percent: z.number().nonnegative(),
  discount_cents: FcfaPositiveSchema,
  line_total_cents: FcfaIntegerSchema,
  sort_order: z.number().int().nonnegative(),
});

// === Vente ===

export const SaleSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  site_id: z.string().min(1),
  device_id: z.string().min(1),
  cash_session_id: z.string().optional().nullable(),
  customer_id: z.string().optional().nullable(),
  sale_number: z.string().min(1),
  sale_status: SaleStatusSchema,
  payment_method: PaymentMethodSchema,
  subtotal_cents: FcfaIntegerSchema,
  discount_cents: FcfaPositiveSchema,
  tax_amount_cents: FcfaPositiveSchema,
  total_cents: FcfaIntegerSchema,
  amount_paid_cents: FcfaPositiveSchema,
  change_cents: FcfaPositiveSchema,
  notes: z.string().optional().nullable(),
  created_by: z.string().min(1),
  voided_by: z.string().optional().nullable(),
  void_reason: z.string().optional().nullable(),
  sync_status: SyncStatusSchema,
  mecef_status: MecefStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

// === Création de Vente (formulaire / API entrante) ===

export const CreateSaleInputSchema = z.object({
  organizationId: z.string().min(1, "L'organisation est obligatoire."),
  siteId: z.string().min(1, "Le site est obligatoire."),
  deviceId: z.string().min(1, "Le terminal/device est obligatoire."),
  cashSessionId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  createdBy: z.string().min(1, "L'utilisateur créateur est obligatoire."),
  paymentMethod: PaymentMethodSchema,
  items: z.array(
    z.object({
      productId: z.string().min(1, "L'article doit avoir un productId."),
      productUnitId: z.string().optional().nullable(),
      quantity: z.number().int().positive("La quantité doit être strictement positive."),
      unitPriceCents: FcfaPositiveSchema,
      productName: z.string().min(1, "Le nom du produit est obligatoire."),
      productReference: z.string().optional(),
      taxGroup: TaxGroupSchema,
      taxRatePercent: z.number().nonnegative().optional(),
      discountCents: FcfaPositiveSchema.optional(),
    })
  ).min(1, "La vente doit contenir au moins un article."),
  discountCents: FcfaPositiveSchema.optional(),
  amountPaidCents: FcfaPositiveSchema,
  notes: z.string().optional().nullable(),
});

// === Création d'Avoir / Remboursement ===

export const CreateRefundSaleInputSchema = z.object({
  originalSaleId: z.string().min(1, "L'identifiant de la vente d'origine est obligatoire."),
  reason: z.string().min(1, "Le motif de l'avoir est obligatoire."),
  createdBy: z.string().min(1, "L'auteur du remboursement est obligatoire."),
  refundItems: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive("La quantité à rembourser doit être positive."),
    })
  ).min(1, "L'avoir doit contenir au moins un article à rembourser."),
});

// === Mouvement de Stock ===

export const StockMovementSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  site_id: z.string().min(1),
  product_id: z.string().min(1),
  product_unit_id: z.string().optional().nullable(),
  movement_type: MovementTypeSchema,
  quantity: z.number().int(), // positif=entrée, négatif=sortie
  unit_cost_cents: FcfaPositiveSchema.optional().nullable(),
  reference_id: z.string().optional().nullable(),
  reference_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  created_by: z.string().min(1),
  sync_status: SyncStatusSchema,
  created_at: z.string(),
});

export const RecordStockMovementInputSchema = z.object({
  organizationId: z.string().min(1, "L'organisation est obligatoire."),
  siteId: z.string().min(1, "Le site est obligatoire."),
  productId: z.string().min(1, "Le produit est obligatoire."),
  productUnitId: z.string().optional().nullable(),
  movementType: MovementTypeSchema,
  quantity: z.number().int({ message: "La quantité doit être un entier." }).refine((q) => q !== 0, {
    message: "La quantité d'un mouvement ne peut pas être égale à 0.",
  }),
  unitCostCents: FcfaPositiveSchema.optional().nullable(),
  referenceId: z.string().optional().nullable(),
  referenceType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().min(1, "Le créateur du mouvement est obligatoire."),
});

// === Session de Caisse ===

export const OpenCashSessionSchema = z.object({
  organizationId: z.string().optional().nullable(),
  siteId: z.string().min(1, "Le site est obligatoire."),
  deviceId: z.string().min(1, "Le poste est obligatoire."),
  cashierId: z.string().min(1, "L'identifiant du caissier est obligatoire."),
  cashierName: z.string().optional().nullable(),
  openingAmountCents: FcfaPositiveSchema,
  notes: z.string().optional().nullable(),
});

export const CloseCashSessionSchema = z.object({
  countedAmountCents: FcfaPositiveSchema,
  notes: z.string().optional().nullable(),
});

// Exports de types inférés depuis les schémas Zod
export type ProductInput = z.infer<typeof ProductSchema>;
export type SaveProductInput = z.infer<typeof SaveProductSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type SaleItemInput = z.infer<typeof SaleItemSchema>;
export type SaleInput = z.infer<typeof SaleSchema>;
export type CreateSaleInput = z.infer<typeof CreateSaleInputSchema>;
export type CreateRefundSaleInput = z.infer<typeof CreateRefundSaleInputSchema>;
export type StockMovementInput = z.infer<typeof StockMovementSchema>;
export type RecordStockMovementInput = z.infer<typeof RecordStockMovementInputSchema>;
export type OpenCashSessionInput = z.infer<typeof OpenCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof CloseCashSessionSchema>;
