/**
 * Denial-of-service bound for tenant-scoped list reads that do not expose
 * pagination yet. It caps the payload a single operator request can force;
 * real pagination remains a separate API contract change.
 */
export const MAX_UNPAGINATED_LIST_ROWS = 500
