import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SkipLink } from "@/components/ui/skipLink";
import get from "lodash/get";
import { LoaderPinwheel } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Navigate,
  Outlet,
  useFetcher,
  useLocation,
  useMatch,
} from "react-router";
import AppSidebar from "~/modules/app/components/appSidebar";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import { connectSockets } from "~/modules/sockets/sockets";
import MaintenanceBanner from "~/modules/systemSettings/components/maintenanceBanner";
import type { User } from "~/modules/users/users.types";
import Splash from "../components/splash";

export default function AuthenticationContainer({
  children,
}: {
  children: ReactNode;
}) {
  const authenticationFetcher = useFetcher();
  const isHomeRoute = useMatch("/");
  const isInviteRoute = useMatch("/invite/:id");
  const isJoinRoute = useMatch("/join/:slug");
  const isSignupRoute = useMatch("/signup");
  const isOnboardingRoute = useMatch("/onboarding");
  const isPrivacyRoute = useMatch("/privacy");
  const lastFetchRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 1 * 60 * 1000;
  const prevAuthRef = useRef<User | null>(null);
  const location = useLocation();
  const isFetching = !authenticationFetcher.data;
  const authentication: User | null = get(
    authenticationFetcher,
    "data.authentication.data",
    null,
  );

  useEffect(() => {
    authenticationFetcher.load(`/api/authentication`);
  }, []);

  useEffect(() => {
    if (!authenticationFetcher.data || authenticationFetcher.state !== "idle")
      return;

    if (authentication) {
      prevAuthRef.current = authentication;
      connectSockets();
    } else if (prevAuthRef.current) {
      window.location.reload();
    }
  }, [authenticationFetcher.state]);

  // reload authentication on client-side navigation so server-side loader
  // updates `lastActivity` and keeps the session alive while browsing.
  // Rate-limit requests to avoid excessive backend calls
  useEffect(() => {
    if (!authenticationFetcher.data) return;
    const now = Date.now();
    if (now - (lastFetchRef.current || 0) > MIN_FETCH_INTERVAL) {
      lastFetchRef.current = now;
      authenticationFetcher.load(`/api/authentication`);
    }
  }, [location.pathname]);

  if (
    isInviteRoute ||
    isJoinRoute ||
    isSignupRoute ||
    isOnboardingRoute ||
    isPrivacyRoute
  ) {
    return <Outlet />;
  }

  if (isFetching) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <LoaderPinwheel className="animate-spin" />
      </div>
    );
  }

  if (!authentication) {
    return isHomeRoute ? <Splash /> : <Navigate to="/signup" replace />;
  }

  return (
    <AuthenticationContext value={authentication}>
      <MaintenanceBanner />
      <SidebarProvider defaultOpen={true}>
        <SkipLink href="#main-content" className="focus:top-4 focus:left-4">
          Skip to main content
        </SkipLink>
        <AppSidebar />
        <SidebarInset
          id="main-content"
          tabIndex={-1}
          aria-label="Main content"
          className="focus-visible:outline-none"
        >
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthenticationContext>
  );
}
