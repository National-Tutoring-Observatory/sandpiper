export type AdminBillingTab = "active-users";

export function adminBillingUrl(tab?: AdminBillingTab): string {
  let url = "/admin/billing";
  if (tab !== undefined) url += `/${tab}`;
  return url;
}
