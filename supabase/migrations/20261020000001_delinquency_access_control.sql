-- ==============================================================================
-- CONTROLE DE ACESSO POR INADIMPLÊNCIA
-- Etapas (ver supabase/functions/_shared/access-policy.ts):
--   1..grace_period_days dias de atraso  -> aviso
--   ..block_after_days                    -> somente leitura
--   > block_after_days                    -> bloqueado (licença suspensa pelo job noturno)
-- ==============================================================================

-- Dias de atraso após os quais o acesso é bloqueado (grace_period_days passa a ser o início do "somente leitura")
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS block_after_days INT NOT NULL DEFAULT 15;

DO $$ BEGIN
  ALTER TABLE public.contracts
    ADD CONSTRAINT contracts_block_after_grace CHECK (block_after_days >= grace_period_days);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Motivo da suspensão: só suspensões por inadimplência são reativadas automaticamente pelo pagamento
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.licenses
    ADD CONSTRAINT licenses_suspension_reason_check CHECK (suspension_reason IN ('delinquency', 'manual'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Consulta feita a cada license-check: faturas em aberto mais antigas de um contrato
CREATE INDEX IF NOT EXISTS invoices_contract_unpaid_idx
  ON public.invoices (contract_id, due_date)
  WHERE status IN ('pending', 'overdue');

-- ==============================================================================
-- AGENDAMENTO (executar manualmente depois de publicar as Edge Functions)
-- Requer as extensões pg_cron e pg_net e o secret CRON_SECRET definido nas funções.
-- Troque <PROJECT_REF> e <CRON_SECRET> antes de rodar:
--
-- select cron.schedule('lynus-reconcile-payments', '0 6 * * *', $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/reconcile-payments',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
-- $$);
-- ==============================================================================
