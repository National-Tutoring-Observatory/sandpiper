export default function formatCost(value: number): string {
  if (value === 0) return "$0.00";
  if (Math.abs(value) < 0.01) return `$${value.toPrecision(2)}`;
  return `$${value.toFixed(2)}`;
}
