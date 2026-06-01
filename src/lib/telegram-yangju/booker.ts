/**
 * Fixed booker phone + yangju credentials, sourced from env.
 *
 * The reservation books under a single fixed person (the yangju account owner).
 * The captured wire body sends `golfuser_name` EMPTY (the server fills the name
 * from the logged-in session), so no booker NAME is needed — only the phone, which
 * is split into hand_tel1/2/3.
 */

export interface Booker {
  hand_tel1: string;
  hand_tel2: string;
  hand_tel3: string;
}

export interface YangjuCreds {
  id: string;
  pw: string;
}

/** Fixed booker phone from `YANGJU_BOOKER_TEL` (11 digits -> 3/4/4). */
export function getBooker(): Booker {
  const telRaw = process.env.YANGJU_BOOKER_TEL;

  if (!telRaw) {
    throw new Error('getBooker: YANGJU_BOOKER_TEL is not set');
  }

  const digits = telRaw.replace(/\D/g, '');
  if (digits.length !== 11) {
    throw new Error(`getBooker: YANGJU_BOOKER_TEL must be 11 digits, got ${digits.length}`);
  }

  return {
    hand_tel1: digits.slice(0, 3),
    hand_tel2: digits.slice(3, 7),
    hand_tel3: digits.slice(7),
  };
}

/** Yangju site login credentials from `YANGJU_ID` / `YANGJU_PW`. */
export function getYangjuCreds(): YangjuCreds {
  const id = process.env.YANGJU_ID;
  const pw = process.env.YANGJU_PW;
  if (!id) throw new Error('getYangjuCreds: YANGJU_ID is not set');
  if (!pw) throw new Error('getYangjuCreds: YANGJU_PW is not set');
  return { id, pw };
}
