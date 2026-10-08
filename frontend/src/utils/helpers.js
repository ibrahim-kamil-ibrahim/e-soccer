import { useState, useEffect, useCallback } from "react"

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (error) {
        console.error("Error saving to localStorage:", error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue]
}

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatTime(timeStr) {
  if (!timeStr) return ""
  const [hours, minutes] = timeStr.split(":")
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export function getStatusColor(status) {
  switch (status) {
    case "LIVE":
      return "text-green-600 bg-green-50"
    case "FT":
      return "text-slate-600 bg-slate-100"
    case "UPCOMING":
      return "text-blue-600 bg-blue-50"
    default:
      return "text-slate-600 bg-slate-100"
  }
}

export function getPositionColor(pos) {
  if (pos === 1) return "text-yellow-600"
  if (pos === 2) return "text-gray-600"
  if (pos === 3) return "text-orange-600"
  return "text-slate-600"
}