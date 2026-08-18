import { useEffect } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../../sessionStorage";
import Onboarding from "../components/onboarding";
import TermsAcceptance from "../components/termsAcceptance";
import sanitizeReturnTo from "../helpers/sanitizeReturnTo";
import type { Route } from "./+types/onboarding.route";

const VALID_ROLES = [
  "Researcher",
  "Grad Student",
  "Instructor/Faculty",
  "Other",
] as const;

const VALID_USE_CASES = [
  "Analyzing student-tutor interactions",
  "Training or evaluating AI tutors",
  "Educational research",
  "Curriculum development",
  "Other",
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (user.onboardingComplete && user.termsAcceptedAt) return redirect("/");
  return { termsAccepted: Boolean(user.termsAcceptedAt) };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  if (user.onboardingComplete && user.termsAcceptedAt) return redirect("/");

  const { intent, payload = {} } = await request.json();

  if (intent === "ACCEPT_TERMS") {
    await UserService.updateById(user._id, {
      termsAcceptedAt: new Date(),
    });
    return data({ success: true, intent: "ACCEPT_TERMS" });
  }

  if (intent === "COMPLETE_ONBOARDING") {
    if (!user.termsAcceptedAt) {
      return data(
        { errors: { general: "You must accept the terms first" } },
        { status: 400 },
      );
    }

    const { institution, userRole, useCases, scholarshipInterest } = payload;

    if (!institution || !String(institution).trim()) {
      return data(
        { errors: { institution: "Institution is required" } },
        { status: 400 },
      );
    }

    if (!VALID_ROLES.includes(userRole)) {
      return data(
        { errors: { userRole: "Please select a valid role" } },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(useCases) ||
      useCases.length === 0 ||
      !useCases.every((v: string) =>
        (VALID_USE_CASES as readonly string[]).includes(v),
      )
    ) {
      return data(
        { errors: { useCases: "Please select at least one use case" } },
        { status: 400 },
      );
    }

    await UserService.updateById(user._id, {
      institution: String(institution).trim(),
      userRole,
      useCases,
      scholarshipInterest: Boolean(scholarshipInterest),
      onboardingComplete: true,
    });

    const session = await sessionStorage.getSession(
      request.headers.get("cookie"),
    );
    const redirectTo = sanitizeReturnTo(session.get("returnTo"));

    return data(
      { success: true, data: { redirectTo } },
      {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      },
    );
  }

  return data({ errors: { general: "Invalid intent" } }, { status: 400 });
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function OnboardingRoute() {
  const { termsAccepted } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data || !("success" in fetcher.data)) return;
    const d = fetcher.data as { success: true; data?: { redirectTo: string } };
    if (d.data?.redirectTo) {
      navigate(d.data.redirectTo);
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const handleAcceptTerms = () => {
    fetcher.submit(JSON.stringify({ intent: "ACCEPT_TERMS" }), {
      method: "POST",
      encType: "application/json",
    });
  };

  const handleSubmit = (formData: {
    institution: string;
    userRole: string;
    useCases: string[];
    scholarshipInterest: boolean;
  }) => {
    fetcher.submit(
      JSON.stringify({ intent: "COMPLETE_ONBOARDING", payload: formData }),
      { method: "POST", encType: "application/json" },
    );
  };

  const errors =
    fetcher.data && "errors" in fetcher.data
      ? (fetcher.data.errors as Record<string, string>)
      : undefined;

  if (!termsAccepted) {
    return (
      <TermsAcceptance
        isSubmitting={isSubmitting}
        onAccept={handleAcceptTerms}
      />
    );
  }

  return (
    <Onboarding
      errors={errors}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    />
  );
}
