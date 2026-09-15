const MSK_TZ = 'Europe/Moscow';

// Moscow has no DST. DATETIME in SQL is stored as MSK wall clock.
const SQL_MSK_NOW = 'DATEADD(HOUR, 3, GETUTCDATE())';

function pad(n) {
  return String(n).padStart(2, '0');
}

// mssql useUTC:true maps DATETIME wall clock onto UTC getters. Attach +03:00 without shifting.
function sqlDateTimeToMskIso(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+03:00`;
}

// Frontend sends an instant (ISO). Convert to a Date whose UTC fields are MSK wall clock for DATETIME compare.
function isoToMskSqlDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const local = d.toLocaleString('sv-SE', { timeZone: MSK_TZ });
  const [datePart, timePart] = local.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function mskTimestamp() {
  return new Date().toLocaleString('sv-SE', { timeZone: MSK_TZ });
}

module.exports = {
  MSK_TZ,
  SQL_MSK_NOW,
  sqlDateTimeToMskIso,
  isoToMskSqlDate,
  mskTimestamp
};
