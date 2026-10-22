import React from 'react';
import { ProposalItem, ProposalSection } from '../../types/index.ts';
import { formatBRL } from '../../utils/finance.ts';
import { amountInWordsBRL, integerToWords } from '../../utils/number-to-words.ts';
import { DEFAULT_SUSPENSION_CLAUSE } from './proposal-template.ts';
import './proposal-document.css';

export const LETTERHEAD_SRC = '/proposal/letterhead.jpg';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatIssueMonth(issueMonth: string) {
  const [y, m] = issueMonth.split('-').map(Number);
  return y && m ? `${MONTHS[m - 1]} / ${y}` : issueMonth;
}

function lines(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function Paragraphs({ text, indent }: { text: string; indent?: boolean }) {
  return (
    <>
      {lines(text).map((l, i) => (
        <p key={i} className={indent ? 'pd-indent' : undefined}>
          {l}
        </p>
      ))}
    </>
  );
}

function Missing({ children, label }: { children?: string; label: string }) {
  return children?.trim() ? <>{children}</> : <span className="pd-missing">[{label}]</span>;
}

function Bullets({ items }: { items: string[] }) {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  if (!clean.length) return null;
  return (
    <ul className="pd-list">
      {clean.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function SectionBody({ section, indent }: { section: ProposalSection; indent?: boolean }) {
  return (
    <>
      <Paragraphs text={section.before} indent={indent} />
      <Bullets items={section.items} />
      <Paragraphs text={section.after} indent={indent} />
    </>
  );
}

/** First paragraph, then the stage lines (ending in ";" or following them) as a list, then the rest */
function SuspensionClause({ text }: { text: string }) {
  const all = lines(text);
  const firstListIdx = all.findIndex((l) => l.endsWith(';'));
  if (firstListIdx === -1) return <Paragraphs text={text} />;
  let lastListIdx = firstListIdx;
  while (lastListIdx + 1 < all.length && all[lastListIdx].endsWith(';')) lastListIdx++;
  return (
    <>
      <Paragraphs text={all.slice(0, firstListIdx).join('\n')} />
      <Bullets items={all.slice(firstListIdx, lastListIdx + 1)} />
      <Paragraphs text={all.slice(lastListIdx + 1).join('\n')} />
    </>
  );
}

function Cover({ p }: { p: ProposalItem }) {
  return (
    <div className="pd-cover">
      <div className="pd-rule pd-rule-navy" />
      <div className="pd-rule pd-rule-light" />

      <div className="pd-cover-meta">
        <strong>PROPOSTA N.º {p.number}</strong>
        <strong>{p.city}</strong>
      </div>

      <div className="pd-cover-kicker">PROPOSTA COMERCIAL</div>
      <div className="pd-cover-kicker-rule" />

      <h1 className="pd-cover-title">{p.system_name}</h1>
      <div className="pd-cover-platform">{p.platform_name}</div>
      <div className="pd-cover-subtitle">{p.subtitle}</div>

      <div className="pd-cover-client">
        <strong>
          <Missing label="Empresa cliente">{p.client_company}</Missing>
        </strong>
        {p.client_contact.trim() && <span>Sr.(a) {p.client_contact}</span>}
      </div>

      <div className="pd-cover-footer">
        <div>
          <strong>{p.company.legal_name}</strong>
          <strong>{p.representative.name}</strong>
        </div>
        <div className="pd-right">
          <strong>{formatIssueMonth(p.issue_month)}</strong>
          <strong>
            <em>Documento confidencial</em>
          </strong>
        </div>
      </div>
      <div className="pd-rule pd-rule-gray" />
      <div className="pd-rule pd-rule-navy" />
    </div>
  );
}

function Letter({ p }: { p: ProposalItem }) {
  return (
    <div className="pd-letter">
      <p>À</p>
      <p>
        <Missing label="Empresa cliente">{p.client_company}</Missing>
      </p>
      <p className="pd-gap">Atte.</p>
      {p.client_contact.trim() && <p>Sr.(a) {p.client_contact}</p>}
      <p className="pd-gap">
        <strong>Referente:</strong> {p.system_name}.
      </p>
      <p className="pd-gap">Prezados (as) Senhores (as),</p>
      <Paragraphs text={p.letter_body} indent />
      <p className="pd-gap-lg">
        <strong>{p.company.legal_name}</strong>
      </p>
      <p>{p.representative.name}</p>
    </div>
  );
}

function Body({ p }: { p: ProposalItem }) {
  const total = p.investment_rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  const months = p.contract_months;

  return (
    <div className="pd-body">
      <h3 className="pd-about-title">
        SOBRE A <span>LYNUS TECH</span>
      </h3>
      <Paragraphs text={p.about} indent />
      <div className="pd-rule pd-rule-light pd-about-rule" />

      <h2>1. {p.objective.title || 'Objetivo da solução'}</h2>
      <SectionBody section={p.objective} indent />

      <h2>2. Escopo do sistema</h2>
      <h3>Módulos desenvolvidos</h3>
      <Paragraphs text={p.scope_intro} />
      {p.modules.map((m, i) => (
        <div key={m.id} className="pd-module">
          <h3>
            {i + 1}. {m.title}
          </h3>
          <SectionBody section={m} />
        </div>
      ))}

      <h2>3. Investimento</h2>
      <table className="pd-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th className="pd-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {p.investment_rows.map((r) => (
            <tr key={r.id}>
              <td>{r.description}</td>
              <td className="pd-right">{r.value === null ? '--------' : formatBRL(r.value)}</td>
            </tr>
          ))}
          <tr className="pd-total">
            <td>TOTAL</td>
            <td className="pd-right">{formatBRL(total)}</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Duração do contrato</h2>
      <p>
        Contrato de{' '}
        <strong>
          {months} ({integerToWords(months)}) {months === 1 ? 'mês' : 'meses'}
        </strong>
        , podendo ser renovado mediante acordo entre as partes.
      </p>

      <h2>5. Cláusula de reajuste anual</h2>
      <Paragraphs text={p.adjustment_clause} />

      <h2>6. Inadimplência e suspensão do acesso</h2>
      <SuspensionClause text={p.suspension_clause ?? DEFAULT_SUSPENSION_CLAUSE} />

      <h2>7. Preços e condições</h2>
      <h3>a) Investimento</h3>
      <p className="pd-tight">
        <strong>Valor para aquisição do sistema (licença):</strong>
      </p>
      <p>
        {formatBRL(p.license_value)} ({amountInWordsBRL(p.license_value)})
      </p>
      <p className="pd-tight">
        <strong>Valor mensal (manutenção, suporte e atualizações):</strong>
      </p>
      <p>
        {formatBRL(p.monthly_value)} ({amountInWordsBRL(p.monthly_value)})
      </p>

      <h2>8. Dados da empresa</h2>
      <div className="pd-company">
        <div>
          <strong>Dados do contratado</strong>
          <strong>{p.company.legal_name}</strong>
          <span>
            CNPJ: <strong>{p.company.cnpj}</strong>
          </span>
          <span>
            Cidade: <strong>{p.company.city}</strong>
          </span>
          <span>
            Estado: <strong>{p.company.state}</strong>
          </span>
        </div>
        <div>
          <strong>Dados bancários</strong>
          <span>
            Banco: <strong>{p.bank.bank}</strong>
          </span>
          <span>
            Agência: <strong>{p.bank.agency}</strong>
          </span>
          <span>
            Conta corrente: <strong>{p.bank.account}</strong>
          </span>
          <span>
            Pix: <strong>{p.bank.pix}</strong>
          </span>
        </div>
      </div>

      <h2>9. Representante da {p.company.legal_name.replace(/\.$/, '')}.</h2>
      <div className="pd-rep">
        <strong>{p.representative.name}</strong>
        <a href={`mailto:${p.representative.email}`}>{p.representative.email}</a>
        <span>{p.representative.phone}</span>
      </div>

      <div className="pd-closing">
        <p>Colocamo-nos ao vosso inteiro dispor para eventuais esclarecimentos.</p>
        <p>
          <strong>Atenciosamente.</strong>
        </p>
      </div>
    </div>
  );
}

interface ProposalDocumentProps {
  proposal: ProposalItem;
  mode: 'preview' | 'print';
}

export function ProposalDocument({ proposal, mode }: ProposalDocumentProps) {
  if (mode === 'print') {
    // Letterhead is position:fixed so the browser repeats it on every printed page;
    // the table header/footer spacers repeat too, reserving the letterhead's top/bottom areas.
    return (
      <div className="pd pd-print">
        <img className="pd-print-bg" src={LETTERHEAD_SRC} alt="" />
        <section className="pd-print-page">
          <Cover p={proposal} />
        </section>
        <section className="pd-print-page">
          <Letter p={proposal} />
        </section>
        <table className="pd-print-flow">
          <thead>
            <tr>
              <td className="pd-print-top" />
            </tr>
          </thead>
          <tfoot>
            <tr>
              <td className="pd-print-bottom" />
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td className="pd-print-content">
                <Body p={proposal} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="pd pd-preview">
      <div className="pd-sheet">
        <Cover p={proposal} />
      </div>
      <div className="pd-sheet">
        <Letter p={proposal} />
      </div>
      <div className="pd-sheet pd-sheet-flow">
        <Body p={proposal} />
      </div>
    </div>
  );
}
