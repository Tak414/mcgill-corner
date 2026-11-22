// Event times are always shown in Montreal time, whatever the viewer's device timezone.
const TIME_ZONE = 'America/Toronto';

const weekdayFmt = new Intl.DateTimeFormat('en-CA', { weekday: 'short', timeZone: TIME_ZONE });
const timeFmt = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE });
const dayFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE });

/** "Sat 20:00" */
export function formatStart(iso: string): string {
  const d = new Date(iso);
  return `${weekdayFmt.format(d)} ${timeFmt.format(d)}`;
}

/** "Sat 20:00 – 23:00", or "Sat 22:00 – Sun 01:00" when it ends on another day. */
export function formatWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = dayFmt.format(start) === dayFmt.format(end);
  return `${formatStart(startIso)} – ${sameDay ? timeFmt.format(end) : formatStart(endIso)}`;
}
