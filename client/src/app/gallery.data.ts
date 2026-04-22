export interface Look {
  id: string;
  title: string;
  file: string;
  width: number;
  height: number;
  alt: string;
}

export interface Measurement {
  label: string;
  value: string;
}

export interface Profile {
  name: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  instagram: string;
  measurements: Measurement[];
  looks: Look[];
}

const MEDIA = '/gallery';

export const PROFILE: Profile = {
  name: 'Jork',
  tagline: 'Editorial · Runway',
  bio: 'Based between New York and Paris. Editorial, runway, and campaign work for luxury houses.',
  location: 'New York · Paris',
  email: 'booking@example.com',
  instagram: 'https://instagram.com/',
  measurements: [
    { label: 'Height', value: '6\'2"' },
    { label: 'Chest', value: '38"' },
    { label: 'Waist', value: '30"' },
    { label: 'Shoes', value: '11 US' },
    { label: 'Hair', value: 'Dark Brown' },
    { label: 'Eyes', value: 'Brown' },
  ],
  looks: [
    {
      id: '1',
      title: 'Dickinson Ave',
      file: 'dickinson.jpeg',
      width: 1170,
      height: 1711,
      alt: 'Night portrait in a yellow hoodie and black jacket against a brick wall, illuminated Dickinson Ave Townhomes sign behind.',
    },
    {
      id: '2',
      title: 'Club — Bellies Out',
      file: 'bellies.jpeg',
      width: 752,
      height: 1376,
      alt: 'Group portrait in blue club lighting, three friends in flannels with bellies out.',
    },
    {
      id: '3',
      title: 'Patriots',
      file: 'patriots.jpeg',
      width: 880,
      height: 1168,
      alt: 'Twin portrait in matching magenta crewnecks in front of an American flag with string lights above.',
    },
    {
      id: '4',
      title: 'Happy Birthday Ethan',
      file: 'ethan.jpeg',
      width: 752,
      height: 1376,
      alt: 'Birthday-filter portrait in an Iowa State hoodie inside a diner booth, sparkling Happy Birthday Ethan overlay.',
    },
    {
      id: '5',
      title: 'Groomsmen',
      file: 'groomsmen.jpeg',
      width: 880,
      height: 1168,
      alt: 'Three men in matching black suits and light blue ties standing at a chapel altar.',
    },
    {
      id: '6',
      title: 'Campaign — Supra',
      file: 'supra.jpeg',
      width: 832,
      height: 1248,
      alt: 'Lakefront campaign shot in Toyota Supra branded athletic wear, Chicago skyline behind.',
    },
    {
      id: '7',
      title: 'Never Stop Exploring',
      file: 'exploring.jpeg',
      width: 832,
      height: 1248,
      alt: 'Ice cave expedition portrait with a camera, bellies out under a frozen overhang.',
    },
    {
      id: '8',
      title: 'Campaign — Pisa',
      file: 'pisa.jpeg',
      width: 892,
      height: 881,
      alt: 'On location in Tuscany wearing a graphic tee, the Leaning Tower of Pisa in the background.',
    },
    {
      id: '9',
      title: 'Sport — Jersey',
      file: 'jersey.jpeg',
      width: 491,
      height: 1599,
      alt: 'Full-length look in a red hockey jersey and knit beanie, interior warm light.',
    },
    {
      id: '10',
      title: 'Interior — Speaker',
      file: 'interior.jpeg',
      width: 768,
      height: 1024,
      alt: 'Candid interior, kneeling beside a tall black speaker in a soft grey room.',
    },
    {
      id: '11',
      title: 'Exuberance',
      file: 'exuberance.jpeg',
      width: 603,
      height: 1104,
      alt: 'Dusk portrait, wide-eyed expression in a blue tank with a pendant necklace.',
    },
    {
      id: '12',
      title: 'Close-up',
      file: 'closeup.jpeg',
      width: 892,
      height: 881,
      alt: 'Extreme close-up portrait, hands lifted to the head, soft window light behind.',
    },
    {
      id: '13',
      title: 'Kicks',
      file: 'kicks.jpeg',
      width: 793,
      height: 990,
      alt: 'Poster-style composite riding a Jordan sneaker styled as a monster truck.',
    },
    {
      id: '14',
      title: 'Transit',
      file: 'transit.jpeg',
      width: 719,
      height: 848,
      alt: 'Late-night terminal look in denim jacket and long black boots beside a metal bench.',
    },
    {
      id: '15',
      title: 'Avatar',
      file: 'avatar.jpeg',
      width: 578,
      height: 525,
      alt: 'Pixel avatar card — the Brawler known as Frick.',
    },
  ],
};

export function lookSrc(look: Look): string {
  return `${MEDIA}/${look.file}`;
}
