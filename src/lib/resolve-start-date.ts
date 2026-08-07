import { DateTime } from 'luxon'

const DAY_NUMBERS: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
}

export function resolveStartDate(
  dayName: string,
  from: string,
  startTime: string,
  timezone: string,
): string {
  const target = DAY_NUMBERS[dayName]
  if (!target) throw new Error(`Unknown rotation start day: ${dayName}`)

  const now = DateTime.fromISO(from, { zone: timezone })
  if (!now.isValid) throw new Error(`Invalid from date: ${now.invalidReason}`)

  let daysAhead = (target - now.weekday + 7) % 7
  if (daysAhead === 0 && now >= DateTime.fromISO(`${now.toISODate()}T${startTime}`, { zone: timezone })) {
    daysAhead = 7
  }

  return now.plus({ days: daysAhead }).toISODate()!
}
