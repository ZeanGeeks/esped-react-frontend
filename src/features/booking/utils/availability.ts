export function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date, count) {
  const result = new Date(date)
  result.setDate(result.getDate() + count)
  return result
}

export function isStayAvailable(checkIn, checkOut, availableDates) {
  for (let date = dateFromKey(checkIn); date < dateFromKey(checkOut); date = addDays(date, 1)) {
    if (!availableDates.has(dateKey(date))) return false
  }
  return true
}
