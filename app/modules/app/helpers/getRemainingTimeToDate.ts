import dayjs from "dayjs";

const pluralize = (count: number, unit: string) =>
  `${count} ${unit}${count === 1 ? "" : "s"} left`;

export default (
  date: string | Date | number | undefined | null,
  fallback = "--",
) => {
  if (!date) return fallback;
  const end = dayjs(date);
  const now = dayjs();
  if (end.isBefore(now)) return "Expired";
  const daysLeft = end.diff(now, "day");
  if (daysLeft > 0) return pluralize(daysLeft, "day");
  const hoursLeft = end.diff(now, "hour");
  if (hoursLeft > 0) return pluralize(hoursLeft, "hour");
  return pluralize(end.diff(now, "minute"), "minute");
};
