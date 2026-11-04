import { channelEntryFromUrl } from './youtubeLinks';

describe('channelEntryFromUrl', () => {
  it.each([
    ['https://www.youtube.com/@3Blue1Brown', '@3Blue1Brown'],
    ['https://www.youtube.com/@3Blue1Brown/videos', '@3Blue1Brown'],
    ['https://youtube.com/@3Blue1Brown?si=abc', '@3Blue1Brown'],
    ['m.youtube.com/@3Blue1Brown', '@3Blue1Brown'],
    ['https://www.youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw', 'UCYO_jab_esuFRV4b17AJtAw'],
    ['https://www.youtube.com/c/numberphile', '@numberphile'],
    ['https://www.youtube.com/user/numberphile/videos', '@numberphile'],
  ])('pulls the channel out of %s', (input, expected) => {
    expect(channelEntryFromUrl(input)).toBe(expected);
  });

  it.each(['@3Blue1Brown', '3Blue1Brown', 'UCYO_jab_esuFRV4b17AJtAw', 'https://youtu.be/abc'])(
    'leaves %s unchanged',
    (input) => {
      expect(channelEntryFromUrl(input)).toBe(input);
    }
  );
});
