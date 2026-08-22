import { describe, it, expect } from 'vitest';
import { getClubHomepageUrl } from '@/lib/utils/clubLink';

describe('getClubHomepageUrl', () => {
  it('returns the site origin, not the scraper AJAX reservation path (laviebell)', () => {
    expect(
      getClubHomepageUrl({
        url: 'https://lavieestbellegolfnresort.com/oldcourse',
        origin: 'https://lavieestbellegolfnresort.com',
        reservation_path: '/GolfRes/onepage/real_timelist_ajax_list.asp',
      }),
    ).toBe('https://lavieestbellegolfnresort.com');
  });

  it.each([
    {
      name: 'edenblue',
      origin: 'https://www.edenblue.co.kr',
      url: 'https://www.edenblue.co.kr',
      reservation_path: '/GolfRes/onepage/real_timelist_ajax_list.asp',
    },
    {
      name: 'yangju',
      origin: 'https://www.yangjucc.co.kr',
      url: 'https://www.yangjucc.co.kr',
      reservation_path: '/GolfRes/onepage/real_timelist_ajax_list.asp',
    },
    {
      name: 'pinestone',
      origin: 'https://www.pinestonecc.com',
      url: 'https://www.pinestonecc.com',
      reservation_path: '/GolfRes/onepage/real_timelist_ajax_list.asp',
    },
    {
      name: 'ferrum',
      origin: 'https://www.ferrumclub.com',
      url: 'https://www.ferrumclub.com',
      reservation_path: '/reservation/real_timelist_ajax_list.asp',
    },
    {
      name: 'onetheclub',
      origin: 'https://www.onetheclub.com',
      url: 'https://www.onetheclub.com',
      reservation_path: '/reservation/ajax/golfTimeList',
    },
    {
      name: 'shinedale',
      origin: 'https://www.shinedale.com',
      url: 'https://www.shinedale.com',
      reservation_path: '/Reservation/Reservation.aspx',
    },
  ])('returns $origin for $name instead of joining reservation_path', ({ origin, url, reservation_path }) => {
    expect(getClubHomepageUrl({ url, origin, reservation_path })).toBe(origin);
  });

  it('prefers origin over the API/scraper url (orangedunesyj)', () => {
    expect(
      getClubHomepageUrl({
        url: 'https://api.orangedunesyj.com',
        origin: 'https://www.orangedunesyj.com',
        reservation_path: '/v1/reservation-calender',
      }),
    ).toBe('https://www.orangedunesyj.com');
  });

  it('falls back to url when origin is missing', () => {
    expect(
      getClubHomepageUrl({
        url: 'https://www.shinedale.com',
        origin: null,
        reservation_path: '/Reservation/Reservation.aspx',
      }),
    ).toBe('https://www.shinedale.com');
  });

  it('returns null when club is missing', () => {
    expect(getClubHomepageUrl(undefined)).toBeNull();
    expect(getClubHomepageUrl(null)).toBeNull();
  });

  it('returns null when both origin and url are empty', () => {
    expect(
      getClubHomepageUrl({
        url: '',
        origin: null,
        reservation_path: '/GolfRes/onepage/real_timelist_ajax_list.asp',
      }),
    ).toBeNull();
  });
});
