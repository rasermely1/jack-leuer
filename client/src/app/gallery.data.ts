export type PhotoCategory = 'runway' | 'studio' | 'group' | 'bw';

export interface Photo {
  file: string;
  alt: string;
  category: PhotoCategory;
}

export interface CategorySection {
  id: PhotoCategory;
  label: string;
  blurb: string;
}

export interface Measurement {
  label: string;
  value: string;
}

export interface Profile {
  name: string;
  initials: string;
  tagline: string;
  email: string;
  instagram: string;
  /** Photo file used as the persistent landing backdrop. */
  heroFile: string;
  measurements: Measurement[];
  categories: CategorySection[];
  photos: Photo[];
}

export const CATEGORIES: CategorySection[] = [
  {
    id: 'runway',
    label: 'Runway',
    blurb: 'Walks, low-angle, and editorial pose work from the runway.',
  },
  {
    id: 'studio',
    label: 'Studio',
    blurb: 'Solo studio frames on white — closeup, profile, and full body.',
  },
  {
    id: 'group',
    label: 'Group',
    blurb: 'Lineups and group editorial shot alongside the cast.',
  },
  {
    id: 'bw',
    label: 'Black & White',
    blurb: 'Monochrome selects pulled from the same sets.',
  },
];

export const PROFILE: Profile = {
  name: 'J. Leuer',
  initials: 'JL',
  tagline: 'Model — runway, editorial, and campaign.',
  email: 'jackleuer@gmail.com',
  instagram: 'https://www.instagram.com/jleuer03/',
  heroFile: 'baggy-closeup.jpg',
  measurements: [
    { label: 'Height', value: '6\'2"' },
    { label: 'Weight', value: '160 lb' },
    { label: 'Chest', value: '40"' },
    { label: 'Waist', value: '31"' },
    { label: 'Inseam', value: '34"' },
    { label: 'Shoulders', value: '18"' },
    { label: 'Suit', value: '40R' },
    { label: 'Shirt', value: '15.5 / 34' },
    { label: 'Shoe', value: '11 US' },
    { label: 'Hair', value: 'Brown' },
    { label: 'Eyes', value: 'Blue' },
  ],
  categories: CATEGORIES,
  // Photos are organized by the keyword in their filename. Precedence:
  //   black-and-white-* → bw, *group-photo* / *lineup* → group,
  //   *runway* / *runwyay* → runway, otherwise → studio.
  photos: [
    { file: 'back-and-white-baggy-reverse.jpg',        alt: 'Black & white — baggy, reverse',     category: 'bw' },
    { file: 'black-and-white-baggy-reverse.jpg',       alt: 'Black & white — baggy, reverse II',  category: 'bw' },
    { file: 'black-and-white-lineup.jpg',              alt: 'Black & white — cast lineup',        category: 'bw' },

    { file: 'baggy-closeup.jpg',                       alt: 'Baggy fit — closeup',                category: 'studio' },
    { file: 'baggy-solo.jpg',                          alt: 'Baggy fit — solo',                   category: 'studio' },
    { file: 'beach-solo-white-bg.jpg',                 alt: 'Beach look — solo on white',         category: 'studio' },
    { file: 'black-solo-white-bg.jpg',                 alt: 'Black look — solo on white',         category: 'studio' },
    { file: 'black-solo-white-bg-side.jpg',            alt: 'Black look — solo, side profile',    category: 'studio' },
    { file: 'dark-baggy-solo-white-bg.jpg',            alt: 'Dark baggy — solo on white',         category: 'studio' },
    { file: 'dark-baggy-solo.jpg',                     alt: 'Dark baggy — solo',                  category: 'studio' },

    { file: 'dark-baggy-group-photo.jpeg',             alt: 'Dark baggy — group',                 category: 'group' },
    { file: 'runway-walk-group-photo-light.JPG',       alt: 'Runway walk — group, light',         category: 'group' },

    { file: 'cow-runway-walk.jpeg',                    alt: 'Runway walk — cow look',             category: 'runway' },
    { file: 'dark-baggy-runway-walk.JPG',              alt: 'Runway walk — dark baggy',           category: 'runway' },
    { file: 'dark-runway-low-angle.JPG',               alt: 'Runway — low angle, dark',           category: 'runway' },
    { file: 'light-cropped-runwyay-pose.jpg',          alt: 'Runway pose — cropped, light',       category: 'runway' },
    { file: 'low-angle-runway-walk-crop-top.JPG',      alt: 'Runway walk — low angle, crop I',    category: 'runway' },
    { file: 'low-angle-runway-walk-crop-top2.JPG',     alt: 'Runway walk — low angle, crop II',   category: 'runway' },
    { file: 'low-angle-runway-walk-cropped-lights.JPG',alt: 'Runway walk — low angle, lights',    category: 'runway' },
    { file: 'pjamas-runway-walk.jpeg',                 alt: 'Runway walk — pajamas',              category: 'runway' },
    { file: 'runway-low-angle-cow.JPG',                alt: 'Runway — low angle, cow look',       category: 'runway' },
    { file: 'runway-pose-beach.jpeg',                  alt: 'Runway pose — beach',                category: 'runway' },
    { file: 'white-runway-walk.jpeg',                  alt: 'Runway walk — white',                category: 'runway' },
    { file: 'white-shirt-runway-pose.jpg',             alt: 'Runway pose — white shirt',          category: 'runway' },
  ],
};

export const EVIL_PROFILE: Profile = {
  ...PROFILE,
  heroFile: 'evilmode/background.jpeg',
  photos: [
    { file: 'evilmode/background.jpeg', alt: 'Evil mode backdrop', category: 'studio' },
    { file: 'evilmode/eve.png', alt: 'Eve', category: 'studio' },
    { file: 'evilmode/the-egg.jpeg', alt: 'The egg', category: 'studio' },
    { file: 'evilmode/dababy.jpeg', alt: 'DaBaby', category: 'studio' },
    { file: 'evilmode/exstatic.jpeg', alt: 'Exstatic', category: 'studio' },
    { file: 'evilmode/jack-leuer.jpeg', alt: 'Jack Leuer', category: 'studio' },
    { file: 'evilmode/weapon.jpeg', alt: 'Weapon', category: 'studio' },
    { file: 'evilmode/goat.jpeg', alt: 'Goat', category: 'studio' },
    { file: 'evilmode/hunger.jpeg', alt: 'Hunger', category: 'studio' },
    { file: 'evilmode/pisa.jpeg', alt: 'Pisa', category: 'runway' },
    { file: 'evilmode/hunter.jpeg', alt: 'Hunter', category: 'runway' },
    { file: 'evilmode/patriots.jpeg', alt: 'Patriots', category: 'runway' },
    { file: 'evilmode/belly-bump.jpeg', alt: 'Belly bump', category: 'group' },
    { file: 'evilmode/cave-bellies.jpeg', alt: 'Cave bellies', category: 'group' },
    { file: 'evilmode/our-first-ep.jpeg', alt: 'Our first EP', category: 'group' },
    { file: 'evilmode/birthday.jpeg', alt: 'Birthday', category: 'group' },
    { file: 'evilmode/amaze-amaze-amaze.jpeg', alt: 'Amaze amaze amaze', category: 'bw' },
  ],
};
