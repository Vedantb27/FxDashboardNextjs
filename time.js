// ------------------ DST Safe MT5 Logic ------------------
function getDstStartUTC(year) {
  const march = new Date(Date.UTC(year, 2, 1));
  const firstSundayOffset = (7 - march.getUTCDay()) % 7;
  return new Date(Date.UTC(year, 2, 1 + firstSundayOffset + 7, 2));
}

function getDstEndUTC(year) {
  const november = new Date(Date.UTC(year, 10, 1));
  const firstSundayOffset = (7 - november.getUTCDay()) % 7;
  return new Date(Date.UTC(year, 10, 1 + firstSundayOffset, 2));
}

function getMt5OffsetHours(dateUTC) {
  const year = dateUTC.getUTCFullYear();
  return (dateUTC >= getDstStartUTC(year) && dateUTC < getDstEndUTC(year)) ? 3 : 2;
}

// ------------------ MT5 Server Time ISO (with offset for proper parsing) ------------------
export function getServerTimeISO() {
  const utcNow = new Date();
  const offset = getMt5OffsetHours(utcNow);
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetAbs = Math.abs(offset);
  const offsetStr = `${offsetSign}${offsetAbs.toString().padStart(2, '0')}:00`;

  // Compute MT5 local components
  let year = utcNow.getUTCFullYear();
  let month = utcNow.getUTCMonth();
  let day = utcNow.getUTCDate();
  let hour = utcNow.getUTCHours() + offset;
  const minutes = utcNow.getUTCMinutes();
  const seconds = utcNow.getUTCSeconds();
  const ms = utcNow.getUTCMilliseconds();

  // Handle hour rollover (e.g., 23:00 UTC + 3 = 02:00 next day)
  if (hour >= 24) {
    hour -= 24;
    const nextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
    year = nextDay.getUTCFullYear();
    month = nextDay.getUTCMonth();
    day = nextDay.getUTCDate();
  } else if (hour < 0) {
    hour += 24;
    const prevDay = new Date(Date.UTC(year, month, day - 1, 23, 59, 59));
    year = prevDay.getUTCFullYear();
    month = prevDay.getUTCMonth();
    day = prevDay.getUTCDate();
  }

  // Build ISO string with MT5 offset
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}${offsetStr}`;
  return iso;
}

// ------------------ Best Possible Local Conversion ------------------
export function convertToUserLocal(serverISO) {
  // Parse the server ISO (with offset) to get the correct universal timestamp, then format in user's system TZ/format
  return new Date(serverISO).toLocaleString();
}

// ------------------ Usage ------------------
const serverISO = getServerTimeISO();
const userLocal = convertToUserLocal(serverISO);

console.log("MT5 Server ISO:", serverISO);
console.log("User Local:", userLocal);