export function getErrorMessage(error: unknown): string {
  return Error.isError(error) ? error.message : String(error);
}
