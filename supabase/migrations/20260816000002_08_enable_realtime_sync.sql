-- Publish every table pulled by SyncEngine so connected devices receive a
-- postgres_changes signal and immediately start an incremental pull.

DO $$
DECLARE
  table_name TEXT;
  realtime_tables TEXT[] := ARRAY[
    'sales',
    'sale_items',
    'stock_movements',
    'cash_sessions',
    'products',
    'customers',
    'categories',
    'sites',
    'suppliers',
    'purchase_orders',
    'user_activity_logs',
    'company_settings'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication
     WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH table_name IN ARRAY realtime_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
           FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = table_name
       ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END $$;
