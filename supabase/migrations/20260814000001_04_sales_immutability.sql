-- ============================================================================
-- Migration 04 : Immuabilité stricte des ventes et des lignes de facture
-- Conforme aux Règles 10, 26, 46 et audit P0-11
-- ============================================================================

-- 1. Fonction trigger interdisant la modification ou suppression des ventes finalisées
CREATE OR REPLACE FUNCTION fn_enforce_sale_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Interdire la suppression physique d'une vente
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Suppression interdite : Les ventes sont immuables (Règles 10 & 26). Utilisez une transaction compensatoire (facture d''avoir).'
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- En cas d'UPDATE sur une vente finalisée
  IF TG_OP = 'UPDATE' THEN
    IF OLD.sale_status IN ('completed', 'refunded') THEN
      -- Vérifier l'altération des colonnes financières ou structurelles
      IF OLD.organization_id <> NEW.organization_id OR
         OLD.site_id <> NEW.site_id OR
         OLD.sale_number <> NEW.sale_number OR
         OLD.subtotal_cents <> NEW.subtotal_cents OR
         OLD.discount_cents <> NEW.discount_cents OR
         OLD.tax_amount_cents <> NEW.tax_amount_cents OR
         OLD.total_cents <> NEW.total_cents OR
         OLD.payment_method <> NEW.payment_method OR
         OLD.created_at <> NEW.created_at THEN
        RAISE EXCEPTION 'Modification interdite : Les montants et données structurelles d''une vente finalisée sont immuables (Règles 10 & 26).'
          USING ERRCODE = 'restrict_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fonction trigger interdisant la modification ou suppression des lignes de facture
CREATE OR REPLACE FUNCTION fn_enforce_sale_items_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_status VARCHAR(50);
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT sale_status INTO v_sale_status FROM sales WHERE id = OLD.sale_id;
    IF v_sale_status IN ('completed', 'refunded') THEN
      RAISE EXCEPTION 'Suppression interdite : Les lignes d''une vente finalisée sont immuables (Règles 10 & 26).'
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT sale_status INTO v_sale_status FROM sales WHERE id = OLD.sale_id;
    IF v_sale_status IN ('completed', 'refunded') THEN
      IF OLD.product_id <> NEW.product_id OR
         OLD.quantity <> NEW.quantity OR
         OLD.unit_price_cents <> NEW.unit_price_cents OR
         OLD.tax_group <> NEW.tax_group OR
         OLD.discount_cents <> NEW.discount_cents OR
         OLD.line_total_cents <> NEW.line_total_cents THEN
        RAISE EXCEPTION 'Modification interdite : Les articles d''une vente finalisée sont immuables (Règles 10 & 26).'
          USING ERRCODE = 'restrict_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attacher les triggers d'immuabilité
DROP TRIGGER IF EXISTS trg_sale_immutability ON sales;
CREATE TRIGGER trg_sale_immutability
  BEFORE UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION fn_enforce_sale_immutability();

DROP TRIGGER IF EXISTS trg_sale_items_immutability ON sale_items;
CREATE TRIGGER trg_sale_items_immutability
  BEFORE UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_enforce_sale_items_immutability();
