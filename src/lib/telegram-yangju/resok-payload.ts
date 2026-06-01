/**
 * Pure assembly of the yangju reservation POST body (`real_resOk.asp`).
 *
 * Verified against a real captured request (see
 * `__tests__/lib/telegram-yangju/__fixtures__/resok-capture.txt`): the body is a
 * standard `application/x-www-form-urlencoded` (UTF-8) form — exactly
 * `URLSearchParams` semantics — with ONE legacy quirk:
 *
 *  - `pointname` is double-encoded: the course name is run through JS `escape()`
 *    first (동 -> `%uB3D9`), then normal form-encoding turns the `%` into `%25`
 *    (-> `%25uB3D9`). So the field's *value* is `jsEscape(course)`, and the
 *    surrounding `URLSearchParams` does the second pass.
 *
 * Everything else is plain UTF-8 form encoding (`pointhole` "18홀" -> `18%ED%99%80`,
 * `gonexturl` -> `.%2Fmy_golfreslist.asp`). NOTE: euc-kr applies to RESPONSE decoding
 * only (the list/login pages); the request body is UTF-8. `golfuser_name` is sent
 * EMPTY verbatim per the capture — do not fill it.
 */

export interface SlotInfo {
  pointdate: string; // YYYYMMDD
  pointid: string; // server-side row id (resolved at tap-time)
  pointtime: string; // HHMM, e.g. "0612"
  pointname: string; // course name in Hangul, e.g. "동" / "서"
  pointhole: string; // e.g. "18홀"
}

export interface BookerFields {
  hand_tel1: string;
  hand_tel2: string;
  hand_tel3: string;
}

/**
 * JS `escape()` semantics, inlined: Korean -> `%uXXXX` (UTF-16 code unit), Latin-1
 * -> `%XX`, unescaped set `A-Za-z0-9@*_+-./` left as-is. Used as the pre-pass on
 * `pointname` only (the form encoder then double-encodes the `%`).
 *
 * Inlined rather than calling the global `escape()` (deprecated, may be absent in
 * stricter runtimes, invisible to `tsc`). BMP-only: a supplementary-plane char
 * (U+10000+) would emit one `%uXXXXX` vs `escape()`'s surrogate-pair output, but
 * yangju course names are BMP Korean, so this never arises.
 */
export function jsEscape(s: string): string {
  return Array.from(s)
    .map((c) => {
      const cp = c.codePointAt(0)!;
      if (cp < 128 && /^[A-Za-z0-9@*_+\-./]$/.test(c)) return c;
      if (cp < 256) return `%${cp.toString(16).toUpperCase().padStart(2, '0')}`;
      return `%u${cp.toString(16).toUpperCase().padStart(4, '0')}`;
    })
    .join('');
}

/**
 * Build the `real_resOk.asp` body. Field order matches the captured request exactly
 * (`URLSearchParams.append` preserves insertion order). `pointname` carries the
 * `jsEscape`'d course; everything else is plain. Empty fields are emitted as `key=`.
 */
export function buildResOkBody(slot: SlotInfo, booker: BookerFields): string {
  const pairs: [string, string][] = [
    ['cmd', 'ins'],
    ['cmval', '0'],
    ['cmkind', ''],
    ['calltype', 'AJAX'],
    ['gonexturl', './my_golfreslist.asp'],
    ['backurl', ''],
    ['pointdate', slot.pointdate],
    ['openyn', '1'],
    ['dategbn', '3'],
    ['pointid', slot.pointid],
    ['pointname', jsEscape(slot.pointname)],
    ['pointtime', slot.pointtime],
    ['golfuser_name', ''],
    ['hand_tel1', booker.hand_tel1],
    ['hand_tel2', booker.hand_tel2],
    ['hand_tel3', booker.hand_tel3],
    ['join_bookg_cnt', ''],
    ['pointhole', slot.pointhole],
    ['ref_check', ''],
    ['ref_name', ''],
    ['ref_tel1', '010'],
    ['ref_tel2', ''],
    ['ref_tel3', ''],
    ['coupon_info', ''],
    ['self_r_yn', 'N'],
    ['self_c_yn', ''],
  ];
  const p = new URLSearchParams();
  for (const [k, v] of pairs) p.append(k, v);
  return p.toString();
}
