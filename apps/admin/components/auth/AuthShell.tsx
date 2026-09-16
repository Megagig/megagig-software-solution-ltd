"use client";

import type { ReactNode } from "react";
import { getTheme } from "@repo/shared/themes";
import { AtlasAuthShell } from "./AtlasAuthShell";
import { AuroraAuthShell } from "./AuroraAuthShell";
import { PulseAuthShell } from "./PulseAuthShell";

export type AuthMode = "login" | "sign-up" | "forgot" | "reset";

export interface AuthShellProps {
  mode: AuthMode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Server-side error from useLogin / useRegister etc. — shown in a banner. */
  errorMessage?: string;
  /** Show social auth buttons + divider. Defaults to true. */
  showSocial?: boolean;
}

// AuthShell is the single entrypoint pages use. It reads
// NEXT_PUBLIC_THEME, resolves the theme tokens, then dispatches to the
// shell that matches the theme's authLayout. Centralising the lookup
// means a page never knows which theme is active — easier to add a new
// theme later.
export function AuthShell(props: AuthShellProps) {
  const theme = getTheme(process.env.NEXT_PUBLIC_THEME);
  switch (theme.authLayout) {
    case "centered":
      return <AuroraAuthShell {...props} theme={theme} />;
    case "split-carousel":
      return <PulseAuthShell {...props} theme={theme} />;
    case "split-static":
    default:
      return <AtlasAuthShell {...props} theme={theme} />;
  }
}
