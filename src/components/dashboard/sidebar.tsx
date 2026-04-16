"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  MessageCircle,
  Globe,
  Users,
  CalendarClock,
  Settings,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "Call History", icon: Phone },
  { href: "/conversations", label: "Conversations", icon: MessageCircle },
  { href: "/websites", label: "Websites", icon: Globe },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/callbacks", label: "Callbacks", icon: CalendarClock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#161b22] text-white flex flex-col min-h-screen border-r border-white/10">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight">DOAI Call Assistant</h1>
            <p className="text-xs text-slate-500">AI Receptionist</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive && "text-blue-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-500">Assistant Active</span>
        </div>
      </div>
    </aside>
  );
}
