type LogLevel = "info" | "warn" | "error"

function log(level: LogLevel, message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    level,
    message,
    ...(data ? { data } : {}),
  }
  if (level === "error") {
    console.error(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info: (message: string, data?: unknown) => log("info", message, data),
  warn: (message: string, data?: unknown) => log("warn", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
}