"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar, SidebarProvider, SidebarInset, SidebarHeader, SidebarContent, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { KeyRound, LockKeyhole, Loader2, FileText, LayoutDashboard } from "lucide-react";
import { UserNav } from "@/components/dashboard/UserNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

// Custom navigation link component that closes mobile sidebar
function NavLink({ href, children, isActive, tooltip }: {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
  tooltip: string;
}) {
  const { setOpenMobile, isMobile } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={tooltip}>
      <Link href={href} onClick={handleClick}>
        {children}
      </Link>
    </SidebarMenuButton>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 justify-between">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold group-data-[collapsible=icon]:hidden">SecurePass</h1>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
             <SidebarMenuItem>
              <NavLink href="/dashboard" isActive={pathname === '/dashboard'} tooltip="Dashboard">
                <LayoutDashboard /><span>Dashboard</span>
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink href="/dashboard/api-keys" isActive={pathname.startsWith('/dashboard/api-keys')} tooltip="API Keys">
                <KeyRound /><span>API Keys</span>
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink href="/dashboard/passwords" isActive={pathname.startsWith('/dashboard/passwords')} tooltip="Passwords">
                <LockKeyhole /><span>Passwords</span>
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink href="/dashboard/notes" isActive={pathname.startsWith('/dashboard/notes')} tooltip="Secure Notes">
                <FileText /><span>Secure Notes</span>
              </NavLink>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="flex-1"></div>
            <ThemeToggle />
            <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
