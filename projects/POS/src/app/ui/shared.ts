/**
 * Deconstruct a Date into an array suitable for new Date(...arr)
 * @param {Date} date
 * @returns {number[]} [year, month, day, hour, minute, second, millisecond]
 */
export function dateToArray(date: Date) {
  return [
    date.getFullYear(), // 4-digit year
    date.getMonth(), // 0–11
    date.getDate(), // 1–31
    date.getHours(), // 0–23
    date.getMinutes(), // 0–59
    date.getSeconds(), // 0–59
    date.getMilliseconds(), // 0–999
  ];
}
