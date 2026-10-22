# Lynus License — integração nos sistemas dos clientes

Código para colar em cada sistema vendido pela Lynus Tech. Ele consulta o Lynus Control e
aplica o bloqueio por inadimplência:

| Situação (padrão do contrato) | O que o sistema do cliente mostra |
|---|---|
| Em dia | Funciona normal |
| 1 a 5 dias de atraso | Faixa amarela de aviso, tudo funciona |
| 6 a 15 dias de atraso | Faixa laranja, **somente leitura** (`canWrite = false`) |
| 16+ dias, licença suspensa, cancelada ou expirada | Tela de **acesso suspenso** (dados preservados) |

Os prazos vêm de cada contrato no Lynus Control (`Aviso até` / `Bloquear após`).

## Arquivos

- `lynus-license.ts` — cliente sem dependências (web, Node, Deno; React Native com polyfill de `crypto.subtle`)
- `LicenseGate.tsx` — componente React com a faixa de aviso e a tela de bloqueio

## Sistema web em React (passo a passo)

1. Copie `lynus-license.ts` e `LicenseGate.tsx` para `src/license/` do sistema.
2. Crie a configuração (os valores vêm do Lynus Control e do Supabase):

```ts
// src/license/config.ts
import { createLicenseClient } from './lynus-license';

export const license = createLicenseClient({
  endpoint: 'https://<PROJECT_REF>.supabase.co/functions/v1/license-check',
  licenseKey: import.meta.env.VITE_LYNUS_LICENSE_KEY, // chave emitida em Licenças
  systemCode: 'LYN-FROTA',                             // código do sistema em Sistemas & Planos
  publicKey: {                                         // saída de scripts/generate-license-keys.mjs
    kty: 'EC', crv: 'P-256', x: '...', y: '...',
  },
  appVersion: '1.0.0',
});
```

3. Envolva o app:

```tsx
import { LicenseGate } from './license/LicenseGate';
import { license } from './license/config';

<LicenseGate client={license} contact="financeiro@lynustech.com.br">
  <App />
</LicenseGate>
```

4. Desabilite gravações no modo somente leitura:

```tsx
const { canWrite } = useLicense();
<button disabled={!canWrite}>Salvar</button>
```

> O bloqueio na tela é a camada visível. Se o sistema tiver backend próprio, ele deve **também**
> recusar gravações quando o estado for `read_only`/`blocked` — o navegador pode ser manipulado.
> O backend pode fazer a mesma chamada ao `license-check` (com a chave do cliente) e conferir `stage`.

## Aplicativo Android

**React Native / Expo:** use o mesmo `lynus-license.ts` com
`react-native-quick-crypto` (fornece `crypto.subtle`) e passe `storage` com um adaptador do
AsyncStorage/SecureStore (`getItem`/`setItem`). Em vez do `LicenseGate.tsx` (web), crie uma tela
de bloqueio nativa usando `license.watch(state => ...)`.

**Nativo (Kotlin/Java):** implemente a chamada HTTP abaixo e verifique a assinatura ECDSA P-256
com a chave pública.

## Contrato HTTP

`POST https://<PROJECT_REF>.supabase.co/functions/v1/license-check`

```json
{ "license_key": "LYNUS-FROX-XXXX-XXXX-CC", "system_code": "LYN-FROTA",
  "fingerprint": "<id único desta instalação>", "app_version": "1.0.0" }
```

Resposta `200`:

```json
{
  "stage": "active | warning | read_only | blocked",
  "reason": "ok | overdue | suspended | revoked | expired | invalid_license | wrong_system | instance_limit",
  "message": "texto pronto para exibir ao usuário",
  "days_overdue": 7,
  "next_stage_at": "2026-10-21T00:00:00.000Z",
  "offline_until": "2026-11-04T12:00:00.000Z",
  "lease": "<payload base64url>.<assinatura base64url>"
}
```

- `lease` = `base64url(JSON)` + `.` + `base64url(assinatura ECDSA P-256/SHA-256 do primeiro trecho)`.
  O JSON tem `key`, `sys`, `fp`, `stage`, `reason`, `msg`, `days`, `next`, `iat`, `exp`.
- Guarde o `lease`. Sem internet, use o último `lease` **com assinatura válida** e `exp` no futuro;
  depois de `exp`, bloqueie até conseguir consultar de novo.
- Rejeite o `lease` se `key`, `sys` ou `fp` não forem desta instalação.
- O `fingerprint` deve ser estável por instalação (gere um UUID na primeira execução e guarde).
  Cada licença aceita até `max_instances` instalações; para trocar de máquina, use
  "Resetar instalações" no Lynus Control.

## Quando consultar

No login, ao abrir o app, a cada 30 minutos e quando a internet voltar (`watch()` já faz isso).
