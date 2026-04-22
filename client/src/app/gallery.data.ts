export interface Photo {
  file: string;
  alt: string;
  /** Top position on the gallery canvas (percent). */
  top: number;
  /** Left position on the gallery canvas (percent). */
  left: number;
  /** Rendered width (percent of canvas). */
  width: number;
  /** Whether the photo is featured in the scattered hero layout. */
  featured?: boolean;
}

export interface Measurement {
  label: string;
  value: string;
}

export interface Profile {
  name: string;
  initials: string;
  email: string;
  instagram: string;
  measurements: Measurement[];
  photos: Photo[];
}

export const PROFILE: Profile = {
  name: 'J. Leuer',
  initials: 'JL',
  email: 'ndhockey03@gmail.com',
  instagram: 'https://www.instagram.com/jleuer03/',
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
  // Positions are hand-tuned against a 4:3 gallery canvas so each photo's
  // rendered bounding box (using its intrinsic aspect ratio) stays clear of
  // its neighbours. If you swap a file, re-check that its `width` leaves
  // room for the resulting height.
  //
  // `featured: true` photos appear in the scattered hero layout on the
  // landing page. Every photo — featured or not — shows up in the full
  // gallery lightbox.
  photos: [
    { file: 'skyline.jpeg',            alt: 'Skyline',                top:  6, left: 30, width: 10, featured: true },
    { file: 'navy-twin.jpeg',          alt: 'Navy — twin',            top:  8, left: 62, width:  8, featured: true },
    { file: 'peace.jpeg',              alt: 'Peace',                  top: 24, left:  6, width: 10, featured: true },
    { file: 'supra.jpeg',              alt: 'Supra',                  top: 40, left: 45, width:  9, featured: true },
    { file: 'stupid.jpeg',             alt: 'Portrait',               top: 45, left: 22, width:  8, featured: true },
    { file: 'money-hang-with-me.jpeg', alt: 'Money — hang with me',   top: 28, left: 80, width:  8, featured: true },
    { file: 'golden-plane.jpeg',       alt: 'Golden plane',           top: 64, left: 60, width:  9, featured: true },
    { file: 'lake.jpeg',               alt: 'Lake',                   top: 68, left:  8, width:  9, featured: true },
    { file: 'respect.jpeg',            alt: 'Respect',                top: 60, left: 82, width:  8, featured: true },
    { file: 'hunger.jpeg',             alt: 'Hunger',                 top:  0, left:  0, width:  0 },
    { file: 'lake-twin.jpeg',          alt: 'Lake — twin',            top:  0, left:  0, width:  0 },
    { file: 'drone-shot.jpeg',         alt: 'Drone shot',             top:  0, left:  0, width:  0 },
    { file: 'ginger-bread.jpeg',       alt: 'Ginger bread',           top:  0, left:  0, width:  0 },
    { file: '500.jpeg',                alt: '500',                    top:  0, left:  0, width:  0 },
    { file: 'goats.jpeg',              alt: 'Group portrait',         top:  0, left:  0, width:  0 },
  ],
};
