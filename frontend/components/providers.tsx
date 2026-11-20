"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { makeQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser tab (useState keeps it stable across re-renders).
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors closeButton duration={3500} />
    </QueryClientProvider>
  );
}
