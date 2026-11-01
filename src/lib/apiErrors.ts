export function getApiErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return 'Could not connect to the resort server. Make sure Apache is running, then try again.'
  }

  return error instanceof Error ? error.message : 'The request could not be completed.'
}
