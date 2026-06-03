export default function getReferenceId<T extends { _id: string }>(
  ref: T | string,
): string {
  return typeof ref === "string" ? ref : ref._id;
}
