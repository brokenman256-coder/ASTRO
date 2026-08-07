"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/session";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/admin/gateway");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
