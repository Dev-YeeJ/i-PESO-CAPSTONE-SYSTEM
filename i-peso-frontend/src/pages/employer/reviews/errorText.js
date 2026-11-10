// First validation message from a Laravel error response, else its message, else the fallback.
export const errorText = (error, fallback) =>
  Object.values(error?.response?.data?.errors ?? {}).flat()[0] ?? error?.response?.data?.message ?? fallback
