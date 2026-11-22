"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { I18nProvider } from "@/lib/i18n";
import { makeQueryClient } from "@/lib/query-client";
import { useTheme } from "@/lib/theme";

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={theme}
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "glass-strong !rounded-xl !text-foreground !shadow-glass",
          description: "!text-muted-foreground",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-destructive",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser tab (useState keeps it stable across re-renders).
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {children}
        <ThemedToaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}
