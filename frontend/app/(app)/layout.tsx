import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import AuthGuard from "@/components/ui/AuthGuard";
import { SidebarProvider } from "@/lib/sidebar-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex h-screen bg-terminal-bg overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-5">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
