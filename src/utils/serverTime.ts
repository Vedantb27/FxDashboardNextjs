// ---------------------------------------------------------
// MT5 TIME UTILS (DST-Safe, Fully Optimized, Single File)
// ---------------------------------------------------------

// --- DST Calculation for MT5 (Matches Real Rules) ---
function getDstStartUTC(year: number): Date {
  // DST starts: 2nd Sunday of March at 02:00 UTC
  const march = new Date(Date.UTC(year, 2, 1));
  const firstSundayOffset = (7 - march.getUTCDay()) % 7;
  const secondSunday = 1 + firstSundayOffset + 7;
  return new Date(Date.UTC(year, 2, secondSunday, 2, 0, 0));
}

function getDstEndUTC(year: number): Date {
  // DST ends: 1st Sunday of November at 02:00 UTC
  const november = new Date(Date.UTC(year, 10, 1));
  const firstSundayOffset = (7 - november.getUTCDay()) % 7;
  const firstSunday = 1 + firstSundayOffset;
  return new Date(Date.UTC(year, 10, firstSunday, 2, 0, 0));
}

// --- MT5 Offset Calculation ---
export function getMt5OffsetHours(dateUTC: Date): number {
  const year = dateUTC.getUTCFullYear();
  const dstStart = getDstStartUTC(year);
  const dstEnd = getDstEndUTC(year);

  // MT5 = UTC+2 (Standard), UTC+3 (DST)
  return dateUTC >= dstStart && dateUTC < dstEnd ? 3 : 2;
}

// ---------------------------------------------------------
// 1) Generate CURRENT MT5 server time as a Date object
// ---------------------------------------------------------
export function getServerTime(): Date {
  const utcNow = new Date();
  const offset = getMt5OffsetHours(utcNow);
  return new Date(utcNow.getTime() + offset * 3600 * 1000);
}

// ---------------------------------------------------------
// 2) Generate MT5 ISO String (like MT5 server format)
// ---------------------------------------------------------
export function getServerTimeISO(): string {
  return convertUtcIsoToMt5Iso(new Date().toISOString());
}

// ---------------------------------------------------------
// 3) Convert ANY UTC ISO → MT5 ISO (DST + rollover safe)
// ---------------------------------------------------------
export function convertUtcIsoToMt5Iso(utcIsoString: any): string {
  const utcNow = new Date(utcIsoString);
  const offset = getMt5OffsetHours(utcNow);

  const offsetSign = offset >= 0 ? "+" : "-";
  const offsetAbs = String(Math.abs(offset)).padStart(2, "0");
  const offsetStr = `${offsetSign}${offsetAbs}:00`;

  // Extract UTC parts
  let year = utcNow.getUTCFullYear();
  let month = utcNow.getUTCMonth();
  let day = utcNow.getUTCDate();
  let hour = utcNow.getUTCHours() + offset; // Apply MT5 offset

  const minutes = utcNow.getUTCMinutes();
  const seconds = utcNow.getUTCSeconds();
  const ms = utcNow.getUTCMilliseconds();

  // Fix rollover (very important)
  if (hour >= 24) {
    hour -= 24;
    const nextDay = new Date(Date.UTC(year, month, day + 1));
    year = nextDay.getUTCFullYear();
    month = nextDay.getUTCMonth();
    day = nextDay.getUTCDate();
  } else if (hour < 0) {
    hour += 24;
    const prevDay = new Date(Date.UTC(year, month, day - 1));
    year = prevDay.getUTCFullYear();
    month = prevDay.getUTCMonth();
    day = prevDay.getUTCDate();
  }

  // Final MT5 ISO
  return (
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T` +
    `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.` +
    `${String(ms).padStart(3, "0")}${offsetStr}`
  );
}

// ---------------------------------------------------------
// 4) Convert MT5 ISO → USER LOCAL DATE STRING
// ---------------------------------------------------------

export function convertToUserLocal(mt5Iso: any): string {
  return new Date(mt5Iso).toLocaleString();
}
export function normalizeMt5Time(input: Date): Date {
  const nowUtc = new Date();
  const mt5Offset = getMt5OffsetHours(nowUtc); // 2 or 3 hours

  const diffHours = (input.getTime() - nowUtc.getTime()) / 3600000;

  // Case 1: time already includes MT5 offset → subtract
  if (Math.abs(diffHours - mt5Offset) < 0.5) {
    return new Date(input.getTime() - mt5Offset * 3600000);
  }

  // Case 2: time is raw UTC → add MT5 offset
  return new Date(input.getTime() + mt5Offset * 3600000);
}
