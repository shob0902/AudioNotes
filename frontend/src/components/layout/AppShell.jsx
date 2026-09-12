// The page frame that puts the sidebar and topbar around each routed page.
import { useState } from "react";
import { DesktopSidebar, MobileSidebar } from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
// Lays out the sidebars and topbar, and owns whether the mobile drawer is open.
export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
