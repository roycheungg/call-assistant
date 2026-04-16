"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Embed page: no sidebar, no padding, no chrome
  if (pathname?.startsWith("/embed")) {
    return <>{children}</>;
  }

  const isFullWidth = pathname?.startsWith("/conversations");

  return (
    <div className="h-full flex w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {isFullWidth ? (
          <div className="h-full">{children}</div>
        ) : (
          <div className="max-w-7xl mx-auto p-8">{children}</div>
        )}
      </main>
    </div>
  );
}
