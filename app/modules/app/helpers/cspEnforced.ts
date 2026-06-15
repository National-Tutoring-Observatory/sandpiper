export default function cspEnforced(): boolean {
  return process.env.CSP_ENFORCE === "true";
}
