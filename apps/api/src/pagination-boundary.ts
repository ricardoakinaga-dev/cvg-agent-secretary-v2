export const HTTP_PAGINATION_MAX_OFFSET = 10_000

export const PAGINATION_OFFSET_ERROR_MESSAGE =
  'offset must be between 0 and 10000'

export type PaginationOffsetFailure = {
  code: 'invalid_pagination'
  message: string
}

export function classifyPaginationOffset(
  raw: unknown
): PaginationOffsetFailure | null {
  const value =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim() !== ''
        ? Number(raw)
        : Number.NaN

  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > HTTP_PAGINATION_MAX_OFFSET
  ) {
    return {
      code: 'invalid_pagination',
      message: PAGINATION_OFFSET_ERROR_MESSAGE
    }
  }

  return null
}
