# Bloqueio por inadimplência — como ativar

Tudo está pronto no código; falta só colocar no ar quando o Supabase for conectado.

## Como funciona

```
Sistema do cliente ──(license-check, a cada 30 min)──► Lynus Control (Supabase)
        ▲                                                   │ faturas + licença + contrato
        └──────────── resposta assinada ◄───────────────────┘
```

| Peça | Arquivo |
|---|---|
| Regra única (aviso → somente leitura → bloqueio) | `supabase/functions/_shared/access-policy.ts` |
| Endpoint consultado pelos sistemas | `supabase/functions/license-check/` |
| Job diário que suspende licenças | `supabase/functions/reconcile-payments/` |
| Reativação ao receber pagamento | `supabase/functions/payment-webhook/` |
| Colunas novas (`block_after_days`, `suspension_reason`) | `supabase/migrations/20261020000001_delinquency_access_control.sql` |
| Código para os sistemas dos clientes | `sdk/lynus-license/` |
| Prévia no painel | coluna **Acesso no cliente** em Licenças |
| Cláusula contratual | seção 6 do modelo de proposta |

Suspensões feitas manualmente no painel **não** são desfeitas pelo pagamento; só as automáticas.

## Checklist para colocar no ar

1. **Aplicar as migrações** (Supabase CLI): `supabase db push`
2. **Gerar as chaves de assinatura:** `node scripts/generate-license-keys.mjs`
   - a **privada** vai no secret abaixo; a **pública** vai no `publicKey` de cada sistema.
3. **Definir os secrets** (use valores longos e aleatórios):
   ```
   supabase secrets set LICENSE_SIGNING_PRIVATE_KEY='<JSON da chave privada>'
   supabase secrets set CRON_SECRET='<valor aleatório>'
   supabase secrets set PAYMENT_WEBHOOK_SECRET='<segredo fornecido pelo banco/gateway>'
   ```
4. **Publicar as funções.** As que não recebem login de usuário do painel são publicadas sem
   verificação de JWT do Supabase (elas têm a própria proteção):
   ```
   supabase functions deploy license-check --no-verify-jwt
   supabase functions deploy payment-webhook --no-verify-jwt
   supabase functions deploy reconcile-payments --no-verify-jwt
   supabase functions deploy notify-fiscal-pending --no-verify-jwt
   supabase functions deploy manage-license
   supabase functions deploy create-charge
   ```
5. **Agendar o job diário:** rode o SQL comentado no fim da migração
   `20261020000001_delinquency_access_control.sql` (troque `<PROJECT_REF>` e `<CRON_SECRET>`).
6. **Configurar o webhook no banco/gateway** apontando para `/functions/v1/payment-webhook`,
   assinando o corpo com HMAC-SHA256 (`x-webhook-signature`). Se o gateway usar outro formato
   de assinatura, ajuste `verifyWebhookSignature` em `_shared/security.ts`.
7. **Cadastrar cada sistema** em Sistemas & Planos com um código (ex.: `LYN-FROTA`) e emitir a
   licença do cliente.
8. **Integrar o SDK** em cada sistema — ver `sdk/lynus-license/README.md`.

## Proteções aplicadas

| Função | Quem pode chamar |
|---|---|
| `license-check` | Qualquer sistema com uma chave válida (só leitura do próprio status) |
| `payment-webhook` | Só quem tem o `PAYMENT_WEBHOOK_SECRET` (assinatura HMAC conferida) |
| `reconcile-payments`, `notify-fiscal-pending` | Só o agendador, com `x-cron-secret` |
| `manage-license` | Usuários logados com perfil Admin/Suporte (Financeiro para suspender/reativar) |
| `create-charge` | Usuários logados com perfil Admin/Financeiro |

Sem os secrets configurados, as funções recusam as chamadas (falham fechadas).

## Testes

```
npx tsx --test supabase/functions/_shared/access-policy.test.ts sdk/lynus-license/lynus-license.test.ts
npx deno test --allow-env supabase/functions/_shared/security.test.ts
```
