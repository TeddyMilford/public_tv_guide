// Theme definitions. A theme sets one night's genre filter and prints its name in
// that night's band.
export const THEMES = [
  { id: 'sunday-movie', label: 'Sunday Night Movie', day: 0, filter: '', note: 'No filter.' },
  { id: 'sunday-scaries', label: 'Sunday Scaries', day: 0, filter: 'horror', note: 'Horror.' },
  { id: 'noir-monday', label: 'Noir Monday', day: 1, filter: 'crime', note: 'Crime.' },
  { id: 'comedy-tuesday', label: 'Comedy Tuesday', day: 2, filter: 'comedy', note: 'Comedy.' },
  { id: 'western-wednesday', label: 'Western Wednesday', day: 3, filter: 'western', note: 'Westerns.' },
  { id: 'thriller-thursday', label: 'Thriller Thursday', day: 4, filter: 'thriller', note: 'Thrillers.' },
  { id: 'friday-fright', label: 'Friday Night Fright', day: 5, filter: 'horror', note: 'Horror.' },
  { id: 'saturday-matinee', label: 'Saturday Matinee', day: 6, filter: 'adventure', note: 'Adventure.' },
];

export const themeById = id => THEMES.find(t => t.id === id) || null;
