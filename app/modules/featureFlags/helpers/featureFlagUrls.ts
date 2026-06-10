export function featureFlagsUrl(featureFlagId?: string): string {
  let url = "/admin/featureFlags";
  if (featureFlagId !== undefined) url += `/${featureFlagId}`;
  return url;
}
