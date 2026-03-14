CREATE OR REPLACE FUNCTION public.jsonb_text_array(input jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    ELSE COALESCE(array_agg(value), ARRAY[]::text[])
  END
  FROM jsonb_array_elements_text(input) AS t(value);
$$;

DO $$
DECLARE
  source_roots_udt text;
  destination_roots_udt text;
BEGIN
  SELECT c.udt_name
  INTO source_roots_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'PipelineRun'
    AND c.column_name = 'sourceRoots';

  SELECT c.udt_name
  INTO destination_roots_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'PipelineRun'
    AND c.column_name = 'destinationRoots';

  IF source_roots_udt = 'jsonb' THEN
    EXECUTE $sql$
      ALTER TABLE "PipelineRun"
      ALTER COLUMN "sourceRoots" TYPE TEXT[]
      USING CASE
        WHEN "sourceRoots" IS NULL THEN NULL
        ELSE public.jsonb_text_array("sourceRoots")
      END
    $sql$;
  END IF;

  IF destination_roots_udt = 'jsonb' THEN
    EXECUTE $sql$
      ALTER TABLE "PipelineRun"
      ALTER COLUMN "destinationRoots" TYPE TEXT[]
      USING CASE
        WHEN "destinationRoots" IS NULL THEN NULL
        ELSE public.jsonb_text_array("destinationRoots")
      END
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PipelineRunStatus'
      AND e.enumlabel = 'IN_PROGRESS'
  ) THEN
    EXECUTE 'ALTER TABLE "PipelineRun" ALTER COLUMN "status" SET DEFAULT ''IN_PROGRESS''';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.jsonb_text_array(jsonb);
