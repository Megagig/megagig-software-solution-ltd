"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-auth";

// The auth cookies are HttpOnly so JS can't peek at them to decide
// where to send the user. Instead we ask the API: /api/auth/me returns
// the User on success and 401 (which useMe converts to null) when the
// session is gone or expired. One short request before the redirect.
export default function RootPage() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(user.role === "USER" ? "/profile" : "/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router, user, isLoading]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}
