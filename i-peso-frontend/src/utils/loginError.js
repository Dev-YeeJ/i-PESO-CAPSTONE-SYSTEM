/**
 * What a sign-in form should say when the request fails.
 *
 * Both login pages used to fall back to "check your credentials" whenever the API sent no
 * message — including when the server could not be reached at all (backend or database
 * down, offline, wrong API URL), so people kept retyping a correct password.
 */
export function loginErrorMessage(error, credentialsFallback) {
  if (!error?.response) {
    return "Can't reach the i-PESO server right now. Check your internet connection and try again in a moment."
  }
  if (error.response.status >= 500) {
    return 'The i-PESO server ran into a problem. Please try again in a moment.'
  }
  return error.response.data?.message ?? credentialsFallback
}
