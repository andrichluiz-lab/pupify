export interface OperatingHours {
  [key: string]: { open: string; close: string; closed: boolean }
}

export interface AgendaHourRange {
  startHour: number
  endHour: number
}

/**
 * Calculate the hour range to display in the agenda based on tenant operating hours
 * Returns the earliest open time and latest close time across all days
 * If no operating hours are configured, returns default 7-20
 */
export function calculateAgendaHourRange(operatingHours: string | null): AgendaHourRange {
  if (!operatingHours) {
    return { startHour: 7, endHour: 20 }
  }

  try {
    const hours: OperatingHours = JSON.parse(operatingHours)
    const openTimes: number[] = []
    const closeTimes: number[] = []

    for (const dayId in hours) {
      const dayHours = hours[dayId]
      if (!dayHours.closed && dayHours.open && dayHours.close) {
        const openHour = parseInt(dayHours.open.split(':')[0], 10)
        const closeHour = parseInt(dayHours.close.split(':')[0], 10)

        // If close hour is earlier than open hour, it means it closes after midnight (e.g., 22:00 to 06:00)
        if (closeHour < openHour) {
          // For 24h clinics that span midnight, we want to show the full day range
          openTimes.push(0)
          closeTimes.push(24)
        } else {
          openTimes.push(openHour)
          closeTimes.push(closeHour)
        }
      }
    }

    if (openTimes.length === 0) {
      return { startHour: 7, endHour: 20 }
    }

    const minOpen = Math.min(...openTimes)
    const maxClose = Math.max(...closeTimes)

    // If it's a 24h clinic (0 to 24), use full day range
    if (minOpen === 0 && maxClose === 24) {
      return { startHour: 0, endHour: 24 }
    }

    // Add some buffer before and after
    return {
      startHour: Math.max(0, minOpen - 1),
      endHour: Math.min(24, maxClose + 1)
    }
  } catch (error) {
    console.error('Error parsing operating hours:', error)
    return { startHour: 7, endHour: 20 }
  }
}

/**
 * Get the hour from an ISO date string in local timezone
 */
export function getLocalHour(isoString: string): number {
  const date = new Date(isoString)
  return date.getHours()
}

/**
 * Get the minutes from an ISO date string in local timezone
 */
export function getLocalMinutes(isoString: string): number {
  const date = new Date(isoString)
  return date.getMinutes()
}

/**
 * Get the day of week from an ISO date string in local timezone
 */
export function getLocalDay(isoString: string): number {
  const date = new Date(isoString)
  return date.getDay()
}
