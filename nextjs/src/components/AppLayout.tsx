"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Files,
  Home,
  Key,
  LogOut,
  Menu,
  SearchCheck,
  User,
  X,
} from "lucide-react";

import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const primaryNavigation: NavItem[] = [
  {
    name: "Overview",
    href: "/app",
    icon: Home,
    description: "Product hub and recent audits",
  },
  {
    name: "Audit Workspace",
    href: "/app/audit",
    icon: SearchCheck,
    description: "Run audits and move into rewrite",
  },
];

const utilityNavigation: NavItem[] = [
  {
    name: "Storage Demo",
    href: "/app/storage",
    icon: Files,
    description: "Legacy template example",
  },
  {
    name: "User Settings",
    href: "/app/user-settings",
    icon: User,
    description: "Password and account preferences",
  },
];

function sectionLabel(pathname: string) {
  if (pathname.startsWith("/app/audit/")) {
    return "Audit Review";
  }
  if (pathname === "/app/audit") {
    return "Audit Workspace";
  }
  if (pathname === "/app/user-settings") {
    return "User Settings";
  }
  if (pathname === "/app/storage") {
    return "Storage Demo";
  }
  return "Overview";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useGlobal();

  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || "AuditFlow";
  const currentSection = useMemo(() => sectionLabel(pathname), [pathname]);

  const handleLogout = async () => {
    try {
      const client = await createSPASassClient();
      await client.logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getInitials = (email: string) => {
    const parts = email.split("@")[0].split(/[._-]/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`group block w-full rounded-2xl border px-3 py-3 transition-all ${
          isActive
            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-xl p-2 ${
              isActive ? "bg-white/10 text-white" : "bg-amber-100 text-amber-700"
            }`}
          >
            <item.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{item.name}</div>
            <div className={`mt-1 text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>{item.description}</div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f0e8_100%)] text-slate-950">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-20 bg-slate-900/35 backdrop-blur-sm lg:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-80 transform border-r border-white/60 bg-white/80 backdrop-blur-xl transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200/80 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Amazon workflow</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{productName}</div>
                <div className="mt-2 max-w-xs text-sm text-slate-500">
                  Audit listings, compare competitors, then generate stronger copy from the same workspace.
                </div>
              </div>
              <button onClick={toggleSidebar} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div>
              <div className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Core flow</div>
              <nav className="mt-3 space-y-2">{primaryNavigation.map(renderNavItem)}</nav>
            </div>

            <div className="mt-8 rounded-3xl border border-amber-200 bg-[radial-gradient(circle_at_top_right,#fde68a,transparent_35%),linear-gradient(180deg,#fffaf0_0%,#fff 100%)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Workflow</div>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div>1. Create or paste a listing draft.</div>
                <div>2. Review score, issues, and priority fixes.</div>
                <div>3. Add competitors and generate rewrite options.</div>
              </div>
            </div>

            <div className="mt-8">
              <div className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Utilities</div>
              <nav className="mt-3 space-y-2">{utilityNavigation.map(renderNavItem)}</nav>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-4 lg:px-8">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden">
                <Menu className="h-5 w-5 text-slate-700" />
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Current section</div>
                <div className="text-lg font-semibold tracking-tight text-slate-950">{currentSection}</div>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                  {user ? getInitials(user.email) : "??"}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs text-slate-400">Signed in</div>
                  <div className="max-w-[220px] truncate text-sm font-medium text-slate-800">{user?.email || "Loading..."}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="truncate text-sm font-medium text-slate-900">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push("/app/user-settings");
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Key className="mr-3 h-4 w-4 text-slate-400" />
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserDropdownOpen(false);
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="mr-3 h-4 w-4 text-rose-400" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
