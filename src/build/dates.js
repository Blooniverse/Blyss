// A date as in 2026-11-10, or with its time as in 2026-11-10T09:30:00+01:00: the format of <time>, of JSON-LD and
// of sitemap.xml, in which the posts are ordered as well.
const w3cDate = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

// Date.parse reads the 30th of February as a day of March, so the day is compared with the one that it returns.
export const isDate = date => typeof date === "string" && w3cDate.test(date) && !Number.isNaN(Date.parse(date)) &&
  new Date(date.slice(0, 10)).toISOString().startsWith(date.slice(0, 10));

export const dateAdvice = `Write a date as 2026-11-10, or with its time as 2026-11-10T09:30:00+01:00.`;
