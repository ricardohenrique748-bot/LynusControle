import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { RequireAuth } from './require-auth.tsx';
import { LoginPage } from '../features/auth/LoginPage.tsx';
import { ProposalsPage } from '../features/proposals/ProposalsPage.tsx';
import { ProposalEditorPage } from '../features/proposals/ProposalEditorPage.tsx';
import { AgendaPage } from '../features/agenda/AgendaPage.tsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.tsx';
import { CustomersPage } from '../features/customers/CustomersPage.tsx';
import { LicensesPage } from '../features/licenses/LicensesPage.tsx';
import { FinancePage } from '../features/finance/FinancePage.tsx';
import { FiscalPage } from '../features/fiscal/FiscalPage.tsx';
import { SystemsPage } from '../features/systems/SystemsPage.tsx';
import { ContractsPage } from '../features/contracts/ContractsPage.tsx';
import { AuditPage } from '../features/audit/AuditPage.tsx';
import { SettingsPage } from '../features/settings/SettingsPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'customers',
        element: <CustomersPage />,
      },
      {
        path: 'licenses',
        element: <LicensesPage />,
      },
      {
        path: 'finance',
        element: <FinancePage />,
      },
      {
        path: 'fiscal',
        element: <FiscalPage />,
      },
      {
        path: 'systems',
        element: <SystemsPage />,
      },
      {
        path: 'contracts',
        element: <ContractsPage />,
      },
      {
        path: 'agenda',
        element: <AgendaPage />,
      },
      {
        path: 'proposals',
        element: <ProposalsPage />,
      },
      {
        path: 'proposals/:id',
        element: <ProposalEditorPage />,
      },
      {
        path: 'audit',
        element: <AuditPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
