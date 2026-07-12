import { loadLocalChain } from "@/lib/server-addresses";
import { DashboardApp } from "@/components/dashboard/dashboard-app";

// Read the local deployment (if any) at request time, then hand off to the client app.
export default function DashboardPage() {
  const local = loadLocalChain();
  return <DashboardApp local={local} />;
}
