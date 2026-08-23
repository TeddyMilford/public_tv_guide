// A stand-in watchlist so the page has something on the air before you import.
// Formatted exactly like an IMDb list export.
export const SAMPLE_CSV = `Position,Const,Created,Modified,Description,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors
1,tt0034583,2024-01-01,,,Casablanca,https://www.imdb.com/title/tt0034583/,movie,8.5,102,1942,"Drama, Romance, War",620000,1942-11-26,Michael Curtiz
2,tt0068646,2024-01-01,,,The Godfather,https://www.imdb.com/title/tt0068646/,movie,9.2,175,1972,"Crime, Drama",2100000,1972-03-24,Francis Ford Coppola
3,tt0047437,2024-01-01,,,Sabrina,https://www.imdb.com/title/tt0047437/,movie,7.6,113,1954,"Comedy, Drama, Romance",70000,1954-10-15,Billy Wilder
4,tt0113277,2024-01-01,,,Heat,https://www.imdb.com/title/tt0113277/,movie,8.3,170,1995,"Action, Crime, Drama",730000,1995-12-15,Michael Mann
5,tt0050083,2024-01-01,,,12 Angry Men,https://www.imdb.com/title/tt0050083/,movie,9.0,96,1957,"Crime, Drama",850000,1957-04-10,Sidney Lumet
6,tt0071315,2024-01-01,,,Chinatown,https://www.imdb.com/title/tt0071315/,movie,8.1,130,1974,"Drama, Mystery, Thriller",320000,1974-06-20,Roman Polanski
7,tt0075314,2024-01-01,,,Taxi Driver,https://www.imdb.com/title/tt0075314/,movie,8.2,114,1976,"Crime, Drama",900000,1976-02-08,Martin Scorsese
8,tt0032551,2024-01-01,,,The Grapes of Wrath,https://www.imdb.com/title/tt0032551/,movie,8.1,129,1940,"Drama, History",90000,1940-03-15,John Ford
9,tt0053125,2024-01-01,,,North by Northwest,https://www.imdb.com/title/tt0053125/,movie,8.3,136,1959,"Adventure, Mystery, Thriller",340000,1959-07-28,Alfred Hitchcock
10,tt0081505,2024-01-01,,,The Shining,https://www.imdb.com/title/tt0081505/,movie,8.4,146,1980,"Drama, Horror",1100000,1980-05-23,Stanley Kubrick
11,tt0070047,2024-01-01,,,The Exorcist,https://www.imdb.com/title/tt0070047/,movie,8.1,122,1973,Horror,450000,1973-12-26,William Friedkin
12,tt0086250,2024-01-01,,,Scarface,https://www.imdb.com/title/tt0086250/,movie,8.3,170,1983,"Crime, Drama",900000,1983-12-09,Brian De Palma
13,tt0107290,2024-01-01,,,Jurassic Park,https://www.imdb.com/title/tt0107290/,movie,8.2,127,1993,"Adventure, Sci-Fi",1000000,1993-06-11,Steven Spielberg
14,tt0088763,2024-01-01,,,Back to the Future,https://www.imdb.com/title/tt0088763/,movie,8.5,116,1985,"Adventure, Comedy, Sci-Fi",1300000,1985-07-03,Robert Zemeckis
15,tt0073486,2024-01-01,,,One Flew Over the Cuckoo's Nest,https://www.imdb.com/title/tt0073486/,movie,8.7,133,1975,Drama,1000000,1975-11-19,Milos Forman
16,tt0060196,2024-01-01,,,"The Good, the Bad and the Ugly",https://www.imdb.com/title/tt0060196/,movie,8.8,161,1966,"Adventure, Western",800000,1966-12-23,Sergio Leone
17,tt0057012,2024-01-01,,,Dr. Strangelove,https://www.imdb.com/title/tt0057012/,movie,8.4,95,1964,"Comedy, War",500000,1964-01-29,Stanley Kubrick
18,tt0064665,2024-01-01,,,Midnight Cowboy,https://www.imdb.com/title/tt0064665/,movie,7.8,113,1969,Drama,120000,1969-05-25,John Schlesinger
19,tt0066921,2024-01-01,,,A Clockwork Orange,https://www.imdb.com/title/tt0066921/,movie,8.3,136,1971,"Crime, Sci-Fi",860000,1971-12-19,Stanley Kubrick
20,tt0078788,2024-01-01,,,Apocalypse Now,https://www.imdb.com/title/tt0078788/,movie,8.4,147,1979,"Drama, Mystery, War",680000,1979-05-19,Francis Ford Coppola
21,tt0083658,2024-01-01,,,Blade Runner,https://www.imdb.com/title/tt0083658/,movie,8.1,117,1982,"Action, Drama, Sci-Fi",800000,1982-06-25,Ridley Scott
22,tt0084787,2024-01-01,,,The Thing,https://www.imdb.com/title/tt0084787/,movie,8.2,109,1982,"Horror, Mystery, Sci-Fi",450000,1982-06-25,John Carpenter
23,tt0087843,2024-01-01,,,Once Upon a Time in America,https://www.imdb.com/title/tt0087843/,movie,8.3,229,1984,"Crime, Drama",370000,1984-06-01,Sergio Leone
24,tt0093058,2024-01-01,,,Full Metal Jacket,https://www.imdb.com/title/tt0093058/,movie,8.3,116,1987,"Drama, War",750000,1987-06-26,Stanley Kubrick
25,tt0095016,2024-01-01,,,Die Hard,https://www.imdb.com/title/tt0095016/,movie,8.2,132,1988,"Action, Thriller",930000,1988-07-15,John McTiernan
26,tt0097576,2024-01-01,,,Indiana Jones and the Last Crusade,https://www.imdb.com/title/tt0097576/,movie,8.2,127,1989,"Action, Adventure",760000,1989-05-24,Steven Spielberg
27,tt0105236,2024-01-01,,,Reservoir Dogs,https://www.imdb.com/title/tt0105236/,movie,8.3,99,1992,"Crime, Drama, Thriller",1100000,1992-09-02,Quentin Tarantino
28,tt0114814,2024-01-01,,,The Usual Suspects,https://www.imdb.com/title/tt0114814/,movie,8.5,106,1995,"Crime, Mystery, Thriller",1100000,1995-08-16,Bryan Singer
29,tt0141842,2024-01-01,,,The Sopranos,https://www.imdb.com/title/tt0141842/,tvSeries,9.2,55,1999,"Crime, Drama",470000,1999-01-10,
30,tt0417299,2024-01-01,,,Avatar: The Last Airbender,https://www.imdb.com/title/tt0417299/,tvSeries,9.3,23,2005,"Animation, Action, Adventure",380000,2005-02-21,
`;

export const SAMPLE_SHOW = {
  title: 'The Sopranos',
  network: 'HBO',
  day: 0,
  time: '21:00',
  runtime: 55,
};
