import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import MobileDashboardHeader from "@/components/dashboard/MobileDashboardHeader";
import MobileDashboardNav from "@/components/dashboard/MobileDashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login?callbackUrl=/dashboard");
  }

  if (session.user.role === "admin" || session.user.role === "super_admin") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      {/* Desktop sidebar — hidden on mobile */}
      <DashboardSidebar />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top header (sticky, shows back + title + bell) */}
        <MobileDashboardHeader />

        {/* Desktop header */}
        <div className="hidden md:block">
          <DashboardHeader />
        </div>

        {/* Page content — extra bottom padding on mobile for the fixed bottom nav */}
        <main className="flex-1 overflow-y-auto p-3 pb-24 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation (dashboard-specific) */}
      <MobileDashboardNav />
    </div>
  );
}
