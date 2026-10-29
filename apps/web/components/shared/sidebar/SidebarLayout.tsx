import { Suspense } from "react";
import ErrorFallback from "@/components/dashboard/ErrorFallback";
import Header from "@/components/dashboard/header/Header";
import DemoModeBanner from "@/components/DemoModeBanner";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ui/spinner";
import ValidAccountCheck from "@/components/utils/ValidAccountCheck";
import { ErrorBoundary } from "react-error-boundary";

import serverConfig from "@karakeep/shared/config";

export default function SidebarLayout({
  children,
  mobileSidebar,
  sidebar,
  modal,
}: {
  children: React.ReactNode;
  mobileSidebar: React.ReactNode;
  sidebar: React.ReactNode;
  modal?: React.ReactNode;
}) {
  return (
    <div className="sm:fixed sm:inset-0 sm:overflow-hidden">
      <a href="#main-content" className="keeply-skip">
        跳转到内容
      </a>
      <Header />
      <div className="flex min-h-[calc(100vh-64px)] w-full flex-col sm:h-[calc(100dvh-64px)] sm:flex-row sm:overflow-hidden">
        <ValidAccountCheck />
        <div className="hidden flex-none sm:flex">{sidebar}</div>
        <main
          id="main-content"
          className="keeply-main min-w-0 flex-1 bg-panel sm:min-h-0 sm:overflow-y-auto sm:border-s"
        >
          {serverConfig.demoMode && <DemoModeBanner />}
          <div className="block w-full sm:hidden">
            {mobileSidebar}
            <Separator />
          </div>
          {modal}
          <div className="keeply-content min-h-30 mx-auto w-full max-w-[1800px] p-4 sm:p-7 lg:p-9">
            <ErrorBoundary fallback={<ErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
