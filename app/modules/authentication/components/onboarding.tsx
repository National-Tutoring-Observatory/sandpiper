import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircleIcon } from "lucide-react";
import { useState } from "react";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";

const USER_ROLES = [
  "Researcher",
  "Grad Student",
  "Instructor/Faculty",
  "Other",
] as const;

const USE_CASE_OPTIONS = [
  "Analyzing student-tutor interactions",
  "Training or evaluating AI tutors",
  "Educational research",
  "Curriculum development",
  "Other",
] as const;

interface OnboardingProps {
  errors?: Record<string, string>;
  isSubmitting: boolean;
  onSubmit: (data: {
    institution: string;
    userRole: string;
    useCases: string[];
    scholarshipInterest: boolean;
  }) => void;
}

export default function Onboarding({
  errors,
  isSubmitting,
  onSubmit,
}: OnboardingProps) {
  const [institution, setInstitution] = useState("");
  const [institutionTouched, setInstitutionTouched] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [scholarshipInterest, setScholarshipInterest] = useState(false);

  const toggleUseCase = (value: string) => {
    setUseCases((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const canSubmit =
    !!institution.trim() && !!userRole && useCases.length > 0 && !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ institution, userRole, useCases, scholarshipInterest });
  };

  return (
    <div className="bg-muted flex min-h-screen w-screen items-center justify-center">
      <div className="bg-background w-full max-w-lg rounded-lg p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img
            src={sandpiperLogo}
            alt="Sandpiper"
            className="h-12 object-contain"
          />
        </div>
        <h1 className="mb-1 text-center text-2xl font-semibold">
          Tell us about yourself
        </h1>
        <p className="text-muted-foreground mb-8 text-center text-sm">
          Help us understand how you plan to use the platform.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              autoFocus
              placeholder="e.g. Cornell University"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              onBlur={() => setInstitutionTouched(true)}
            />
            {institutionTouched && !institution.trim() && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>
                  Please enter your university or institution name to continue.
                </AlertDescription>
              </Alert>
            )}
            {errors?.institution && (
              <p className="text-destructive text-sm">{errors.institution}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userRole">Your role</Label>
            <Select value={userRole} onValueChange={setUserRole}>
              <SelectTrigger id="userRole">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.userRole && (
              <p className="text-destructive text-sm">{errors.userRole}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>How do you plan to use the platform?</Label>
            {USE_CASE_OPTIONS.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={option}
                  checked={useCases.includes(option)}
                  onCheckedChange={() => toggleUseCase(option)}
                />
                <Label htmlFor={option} className="cursor-pointer font-normal">
                  {option}
                </Label>
              </div>
            ))}
            {errors?.useCases && (
              <p className="text-destructive text-sm">{errors.useCases}</p>
            )}
          </div>

          <div className="border-primary flex gap-2 rounded-lg border border-dashed p-4">
            <Checkbox
              id="scholarshipInterest"
              checked={scholarshipInterest}
              className="mt-0.5"
              onCheckedChange={(checked) =>
                setScholarshipInterest(checked === true)
              }
            />
            <Label
              htmlFor="scholarshipInterest"
              className="cursor-pointer leading-relaxed font-normal"
            >
              Apply for NTO Research Scholarship.
              <br />
              Free credits for qualifying research projects. We'll follow up by
              email
            </Label>
          </div>

          {errors?.general && (
            <p className="text-destructive text-sm">{errors.general}</p>
          )}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isSubmitting ? "Saving..." : "Continue →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
