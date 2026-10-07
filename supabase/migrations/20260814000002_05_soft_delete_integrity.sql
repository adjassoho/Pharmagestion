-- ============================================================================
-- Migration 05 : Intégrité Référentielle & Soft Delete des Produits (P1-03)
--
-- Empêche la suppression physique (DELETE SQL) des produits pour préserver
-- l'intégrité des clés étrangères historiques (sale_items, stock_movements,
-- purchase_order_items).
-- Les suppressions doivent se faire via le soft delete : is_active = false.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_prevent_hard_delete_products()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Suppression physique interdite sur la table products (Audit P1-03). Veuillez utiliser le soft delete (is_active = false) pour préserver l''intégrité référentielle des factures et mouvements de stock.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_products ON products;
CREATE TRIGGER trg_prevent_hard_delete_products
  BEFORE DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_hard_delete_products();
