/**
 * Slot date/time format normalizers — the SEAM between the two entry paths.
 *
 * Both the alert path (tee_times: `YYYY-MM-DD`, `HH:MM[:SS]`) and the /book path
 * (fetchSlots: `YYYYMMDD`, `HHMM`) must converge on the SAME callback_data /
 * idempotency-key format, or the same logical slot gets two keys and the
 * double-book guard is defeated. Keep these here, shared by the check route, the
 * webhook, AND the seam test, so the safety proof exercises shipped code.
 */

/** `YYYY-MM-DD` -> `YYYYMMDD` (tee_times date -> callback_data date). */
export const toYmd = (dateDash: string): string => dateDash.replace(/-/g, '');

/** `HH:MM[:SS]` -> `HHMM` (tee_times teeoff -> callback_data time). */
export const toHhmm = (teeoff: string): string => teeoff.slice(0, 5).replace(':', '');

/** `YYYYMMDD` -> `YYYY-MM-DD` (callback_data date -> DB date for the idempotency key). */
export const fmtDate = (yyyymmdd: string): string =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

/** `HHMM` -> `HH:MM` (display). */
export const fmtTime = (hhmm: string): string => `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
