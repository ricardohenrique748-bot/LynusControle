/**
 * React gate for customer systems: shows the payment banner, read-only notice or block screen.
 * Copy next to lynus-license.ts. Styling is inline so it works with or without Tailwind.
 *
 *   const license = createLicenseClient({ ... });
 *   <LicenseGate client={license} contact="financeiro@lynustech.com.br · (17) 0000-0000">
 *     <App />
 *   </LicenseGate>
 *
 * Inside the app, disable create/edit actions with:  const { canWrite } = useLicense();
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { LicenseClient, LicenseState } from './lynus-license.ts';

interface LicenseContextValue {
  state: LicenseState | null;
  canWrite: boolean;
  recheck: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue>({
  state: null,
  canWrite: true,
  recheck: async () => {},
});

export function useLicense() {
  return useContext(LicenseContext);
}

const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function Banner({ tone, children }: { tone: 'warning' | 'read_only'; children: React.ReactNode }) {
  const colors =
    tone === 'warning'
      ? { bg: '#fef3c7', border: '#f59e0b', text: '#78350f' }
      : { bg: '#ffedd5', border: '#ea580c', text: '#7c2d12' };
  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2147483000,
        background: colors.bg,
        borderBottom: `2px solid ${colors.border}`,
        color: colors.text,
        padding: '10px 16px',
        font: `500 14px/1.4 ${font}`,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

function BlockScreen({
  state,
  contact,
  onRetry,
  retrying,
}: {
  state: LicenseState;
  contact?: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="lynus-block-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483001,
        background: '#0b1120',
        color: '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        font: `400 15px/1.5 ${font}`,
      }}
    >
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            borderRadius: 16,
            background: '#7f1d1d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          🔒
        </div>
        <h1 id="lynus-block-title" style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#fff' }}>
          {state.reason === 'offline_expired' ? 'Sem conexão para validar a licença' : 'Acesso suspenso'}
        </h1>
        <p style={{ margin: '0 0 20px', color: '#94a3b8' }}>{state.message}</p>
        {contact && (
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#cbd5e1' }}>
            Fale com a Lynus Tech: <strong>{contact}</strong>
          </p>
        )}
        <button
          onClick={onRetry}
          disabled={retrying}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#0891b2',
            color: '#fff',
            font: `600 14px ${font}`,
            cursor: retrying ? 'wait' : 'pointer',
            opacity: retrying ? 0.7 : 1,
          }}
        >
          {retrying ? 'Verificando...' : 'Verificar novamente'}
        </button>
      </div>
    </div>
  );
}

export function LicenseGate({
  client,
  contact,
  intervalMs,
  children,
}: {
  client: LicenseClient;
  contact?: string;
  intervalMs?: number;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LicenseState | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => client.watch(setState, intervalMs), [client, intervalMs]);

  const recheck = async () => {
    setRetrying(true);
    try {
      setState(await client.check());
    } finally {
      setRetrying(false);
    }
  };

  const value: LicenseContextValue = { state, canWrite: state ? state.canWrite : true, recheck };

  return (
    <LicenseContext.Provider value={value}>
      {state?.stage === 'warning' && <Banner tone="warning">⚠️ {state.message}</Banner>}
      {state?.stage === 'read_only' && (
        <Banner tone="read_only">🔒 {state.message} Novos lançamentos estão desabilitados.</Banner>
      )}
      {state?.stage === 'blocked' ? (
        <BlockScreen state={state} contact={contact} onRetry={recheck} retrying={retrying} />
      ) : (
        children
      )}
    </LicenseContext.Provider>
  );
}
