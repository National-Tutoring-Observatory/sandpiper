import { useContext, useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "react-router";

import { NavigationProgress } from "@/components/ui/navigation-progress";
import { toast, Toaster } from "sonner";
import sandpiperFavicon from "~/assets/sandpiper-favicon.svg";
import * as ga from "~/modules/analytics/analytics";
import { NonceContext } from "~/modules/app/helpers/nonce";
import getSessionUser from "~/modules/authentication/helpers/getSessionUser";
import getInitialCreditsAmount from "~/modules/billing/helpers/getInitialCreditsAmount.server";
import { SystemSettingsService } from "~/modules/systemSettings/systemSettings";
import sessionStorage from "../sessionStorage";
import type { Route } from "./+types/root";
import "./app.css";
import AuthenticationContainer from "./modules/authentication/containers/authentication.container";
import DialogContainer from "./modules/dialogs/containers/dialog.container";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: sandpiperFavicon, type: "image/svg+xml" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Josefin+Sans:wght@300;400;700&display=swap",
  },
];

export const meta: Route.MetaFunction = () => [{ title: "Sandpiper - NTO" }];

const TERMS_EXEMPT_PATHS = [
  "/onboarding",
  "/auth/",
  "/api/authentication",
  "/api/webhooks/",
  "/signup",
  "/invite/",
];

export async function loader({ request }: Route.LoaderArgs) {
  let maintenanceMode = false;
  try {
    maintenanceMode = await SystemSettingsService.isMaintenanceMode();
  } catch {
    // DB not ready or unavailable — default to false
  }

  const url = new URL(request.url);
  const isExempt = TERMS_EXEMPT_PATHS.some((p) => url.pathname.startsWith(p));

  if (!isExempt) {
    const user = await getSessionUser({ request });
    if (user && (!user.onboardingComplete || !user.termsAcceptedAt)) {
      return redirect("/onboarding");
    }
  }

  // Read and consume one-shot flash toast from session
  const session = await sessionStorage.getSession(
    request.headers.get("cookie"),
  );
  const flashToast = session.get("flashToast") as string | undefined;

  return Response.json(
    {
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || null,
      maintenanceMode,
      initialCredits: getInitialCreditsAmount(),
      flashToast: flashToast ?? null,
    },
    flashToast
      ? {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        }
      : undefined,
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  // The nonce is only set during server rendering (see entry.server.tsx);
  // on the client this context is empty by design. The browser blanks the
  // nonce attribute once it has validated it (HTML spec, to stop CSS-selector
  // exfiltration), so hydrating with "" matches the DOM and avoids a mismatch
  // warning. Sending the real nonce to the client would be a leak.
  const nonce = useContext(NonceContext);

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <NavigationProgress />
        <AuthenticationContainer>{children}</AuthenticationContainer>
        <Toaster />
        <DialogContainer />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

function useGoogleAnalytics(gaId: string | null) {
  const location = useLocation();

  useEffect(() => {
    if (gaId) ga.initialize(gaId);
  }, [gaId]);

  useEffect(() => {
    ga.trackPageView(location.pathname);
  }, [location]);
}

export default function App() {
  const { googleAnalyticsId, flashToast } = useLoaderData<typeof loader>();
  useGoogleAnalytics(googleAnalyticsId);

  useEffect(() => {
    if (flashToast) toast(flashToast);
  }, [flashToast]);

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
