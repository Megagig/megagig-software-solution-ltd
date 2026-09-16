"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {/*
          richColors gives us sonner's tinted success/error/warning/info
          surfaces. We override sonner's default palette via CSS vars in
          globals.css so green = Grit success (#00b894), red = danger
          (#ff6b6b), etc. — matching the rest of the design system.
        */}
        <Toaster
          richColors
          position="bottom-right"
          theme="dark"
          toastOptions={{
            classNames: {
              toast: "grit-toast",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
