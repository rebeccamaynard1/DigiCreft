import DashboardPage from "./Dashboard";

/**
 * Customer Portal — logged-in users can view their past orders,
 * download files, and regenerate PDFs. Re-uses the Dashboard view
 * so behaviour stays consistent.
 */
export default function PortalPage() {
  return <DashboardPage />;
}
