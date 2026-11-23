const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format an ISO timestamp in its own offset, for example "Thu, May 5, 2005, 11:01 AM (UTC+5)". */
export function formatTimestamp(iso: string): string | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = match[5] ?? "00";
  const offset = match[7] ?? "Z";
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || Number(minute) > 59) return null;
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
  const monthName = MONTHS[month - 1] ?? "";
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${weekday}, ${monthName} ${day}, ${year}, ${hour12}:${minute} ${ampm} (${zoneLabel(offset)})`;
}

function zoneLabel(offset: string): string {
  if (offset === "Z") return "UTC";
  const sign = offset[0] ?? "+";
  const [hourPart, minutePart] = offset.slice(1).split(":");
  const hours = String(Number(hourPart));
  if (!minutePart || minutePart === "00") return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${minutePart}`;
}
