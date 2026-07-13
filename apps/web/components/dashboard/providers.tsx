"use client";

import { WagmiProvider, type Config } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ config, children }: { config: Config; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    // reconnectOnMount={false}: never touch a wallet until the user clicks Connect,
    // so visitors don't get an "open wallet app" prompt just for viewing the page.
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
