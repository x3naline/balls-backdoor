export default {
  // Format date to YYYY-MM-DD
  formatDate: (date) => {
    return date.toISOString().split("T")[0]
  },

  // Format time to HH:MM:SS
  formatTime: (date) => {
    return date.toTimeString().split(" ")[0]
  },

  // Add days to a date
  addDays: (date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  // Check if a date is in the past
  isPast: (date) => {
    return new Date(date) < new Date()
  },

  // Calculate difference in days between two dates
  daysDifference: (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000 // hours*minutes*seconds*milliseconds
    const firstDate = new Date(date1)
    const secondDate = new Date(date2)
    return Math.round(Math.abs((firstDate - secondDate) / oneDay))
  },
}
