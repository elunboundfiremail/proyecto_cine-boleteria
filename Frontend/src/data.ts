/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Movie, Room, Show, TicketRef, DistributorEmail, PaymentMethod, ChannelType } from './types';

export const INITIAL_ROOMS: Room[] = [
  { id: 'room-1', name: 'Sala Grande A', size: 'Grande 1', capacity: 150 },
  { id: 'room-2', name: 'Sala Grande B', size: 'Grande 2', capacity: 150 },
  { id: 'room-3', name: 'Sala Mediana', size: 'Media', capacity: 100 },
  { id: 'room-4', name: 'Sala Pequeña', size: 'Pequeña', capacity: 60 }
];

export const INITIAL_MOVIES: Movie[] = [
  {
    id: 'movie-1',
    title: 'Gladiador II',
    posterUrl: 'https://images.unsplash.com/photo-1559108460-11502216b785?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ageRating: '+16',
    duration: 148,
    genre: 'Acción, Drama',
    synopsis: 'Años después de presenciar la muerte del venerado héroe Máximo a manos de su tío, Lucio se ve obligado a ingresar al Coliseo después de que su hogar sea conquistado por los tiránicos emperadores.',
    isActive: true,
    allowSeatSelection: true
  },
  {
    id: 'movie-2',
    title: 'Moana 2',
    posterUrl: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ageRating: 'ATP',
    duration: 100,
    genre: 'Animación, Familia, Aventura',
    synopsis: 'Tras recibir una llamada inesperada de sus ancestros navegantes, Moana debe viajar a los lejanos mares de Oceanía y a aguas peligrosas y perdidas hace mucho tiempo para una aventura sin precedentes.',
    isActive: true,
    allowSeatSelection: true
  },
  {
    id: 'movie-3',
    title: 'Duna: Parte Dos',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ageRating: '+13',
    duration: 166,
    genre: 'Ciencia Ficción, Aventura',
    synopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia. Enfrentando una elección entre el amor de su vida y el destino del universo.',
    isActive: true,
    allowSeatSelection: false
  },
  {
    id: 'movie-4',
    title: 'Intensamente 2',
    posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ageRating: 'ATP',
    duration: 96,
    genre: 'Animación, Comedia, Aventura',
    synopsis: 'Vuelve a la mente de una adolescente Riley justo cuando se implementa una nueva renovación: la llegada de nuevas emociones como Ansiedad, Envidia, Vergüenza y Aburrimiento.',
    isActive: true,
    allowSeatSelection: false
  }
];

// Helper to convert HH:MM to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper to add minutes to HH:MM
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Calculate EndTime including 15 min buffer
export function getEndTimeWithBuffer(startTime: string, duration: number): string {
  const startMin = timeToMinutes(startTime);
  const totalMin = startMin + duration + 15; // movie duration + 15 min buffer
  return minutesToTime(totalMin);
}

// Generate base repetitive showtimes
export const INITIAL_SHOWTIMES: Show[] = [
  // Room 1 (Grande A): 2:00 PM, 5:30 PM, 9:00 PM
  {
    id: 'show-1',
    movieId: 'movie-1', // Gladiador II (148m) + 15m = 163m (2h 43m)
    roomId: 'room-1',
    startTime: '14:00',
    endTime: getEndTimeWithBuffer('14:00', 148), // 16:43
    date: 'base',
    price: 45
  },
  {
    id: 'show-2',
    movieId: 'movie-1',
    roomId: 'room-1',
    startTime: '17:30',
    endTime: getEndTimeWithBuffer('17:30', 148), // 20:13
    date: 'base',
    price: 45
  },
  {
    id: 'show-3',
    movieId: 'movie-3', // Duna: Parte Dos (166m) + 15m = 181m
    roomId: 'room-1',
    startTime: '20:30',
    endTime: getEndTimeWithBuffer('20:30', 166), // 23:31
    date: 'base',
    price: 45
  },

  // Room 2 (Grande B): 2:30 PM, 5:00 PM, 8:00 PM
  {
    id: 'show-4',
    movieId: 'movie-3',
    roomId: 'room-2',
    startTime: '14:30',
    endTime: getEndTimeWithBuffer('14:30', 166), // 17:31
    date: 'base',
    price: 45
  },
  {
    id: 'show-5',
    movieId: 'movie-2', // Moana 2 (100m) + 15m = 115m
    roomId: 'room-2',
    startTime: '18:00',
    endTime: getEndTimeWithBuffer('18:00', 100), // 19:55
    date: 'base',
    price: 40
  },
  {
    id: 'show-6',
    movieId: 'movie-2',
    roomId: 'room-2',
    startTime: '20:30',
    endTime: getEndTimeWithBuffer('20:30', 100), // 22:25
    date: 'base',
    price: 40
  },

  // Room 3 (Media): 2:00 PM, 4:30 PM, 7:00 PM, 9:20 PM
  {
    id: 'show-7',
    movieId: 'movie-4', // Intensamente 2 (96m)
    roomId: 'room-3',
    startTime: '14:00',
    endTime: getEndTimeWithBuffer('14:00', 96), // 15:51
    date: 'base',
    price: 35
  },
  {
    id: 'show-8',
    movieId: 'movie-4',
    roomId: 'room-3',
    startTime: '16:15',
    endTime: getEndTimeWithBuffer('16:15', 96), // 18:06
    date: 'base',
    price: 35
  },
  {
    id: 'show-9',
    movieId: 'movie-1',
    roomId: 'room-3',
    startTime: '18:30',
    endTime: getEndTimeWithBuffer('18:30', 148), // 21:13
    date: 'base',
    price: 40
  },

  // Room 4 (Pequeña): 3:00 PM, 6:00 PM, 9:00 PM
  {
    id: 'show-10',
    movieId: 'movie-2',
    roomId: 'room-4',
    startTime: '15:00',
    endTime: getEndTimeWithBuffer('15:00', 100), // 16:55
    date: 'base',
    price: 30
  },
  {
    id: 'show-11',
    movieId: 'movie-4',
    roomId: 'room-4',
    startTime: '18:00',
    endTime: getEndTimeWithBuffer('18:00', 96), // 19:51
    date: 'base',
    price: 30
  }
];

// Helper to format today's date "YYYY-MM-DD"
export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Helper to format tomorrow's date "YYYY-MM-DD"
export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Generate some dummy sales for metrics
// To make sure some showtimes have low occupancy, we can distribute them differently
export const INITIAL_TICKETS: TicketRef[] = [
  // Show 1 is heavily booked -> 135 tickets sold (90% occupancy)
  ...Array.from({ length: 135 }).map((_, idx) => ({
    id: `tk-1-${idx}`,
    showId: 'show-1',
    showDate: getTodayDateString(),
    movieTitle: 'Gladiador II',
    roomName: 'Sala Grande A',
    startTime: '14:00',
    pricePaid: 45,
    nit: String(1000000 + Math.floor(Math.random() * 9000000)),
    clientName: ['Carlos Gomez', 'Maria Mendez', 'Jose Perez', 'Ana Rodriguez'][idx % 4],
    paymentMethod: (idx % 2 === 0 ? 'QR' : 'Efectivo') as PaymentMethod,
    channel: (idx % 3 === 0 ? 'Online' : 'Fisica') as ChannelType,
    isPromo2x1: false,
    seatNumbers: [`Asiento A-${idx + 1}`],
    timestamp: new Date().toISOString()
  })),

  // Show 10 (Room 4, Pequeña: capacity 60) -> 12 tickets sold (20% occupancy) -> qualifies for 2x1 promo!
  ...Array.from({ length: 12 }).map((_, idx) => ({
    id: `tk-10-${idx}`,
    showId: 'show-10',
    showDate: getTodayDateString(),
    movieTitle: 'Moana 2',
    roomName: 'Sala Pequeña',
    startTime: '15:00',
    pricePaid: 30,
    nit: String(1020300 + idx),
    clientName: 'Cliente BoxOffice',
    paymentMethod: 'Efectivo' as PaymentMethod,
    channel: 'Fisica' as ChannelType,
    isPromo2x1: false,
    seatNumbers: [`Asiento A-${idx + 1}`],
    timestamp: new Date().toISOString()
  })),

  // Show 4 (Room 2, Grande B: capacity 150) -> 60 tickets sold (40% occupancy)
  ...Array.from({ length: 60 }).map((_, idx) => ({
    id: `tk-4-${idx}`,
    showId: 'show-4',
    showDate: getTodayDateString(),
    movieTitle: 'Duna: Parte Dos',
    roomName: 'Sala Grande B',
    startTime: '14:30',
    pricePaid: 45,
    nit: String(1050600 + idx),
    clientName: 'Cliente Online',
    paymentMethod: 'QR' as PaymentMethod,
    channel: 'Online' as ChannelType,
    isPromo2x1: false,
    seatNumbers: [`Asiento B-${idx + 1}`],
    timestamp: new Date().toISOString()
  })),

  // Some tickets for yesterday to show historic data in metrics
  ...Array.from({ length: 45 }).map((_, idx) => {
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 1);
    const dateStr = prevDate.toISOString().split('T')[0];
    return {
      id: `tk-old-${idx}`,
      showId: 'show-1',
      showDate: dateStr,
      movieTitle: 'Gladiador II',
      roomName: 'Sala Grande A',
      startTime: '14:00',
      pricePaid: 45,
      nit: '9902345',
      clientName: 'Historico',
      paymentMethod: 'Efectivo' as PaymentMethod,
      channel: 'Fisica' as ChannelType,
      isPromo2x1: false,
      seatNumbers: [`Asiento H-${idx + 1}`],
      timestamp: prevDate.toISOString()
    };
  })
];

export const INITIAL_EMAILS: DistributorEmail[] = [
  {
    id: 'em-1',
    date: getTodayDateString(),
    movieTitle: 'Spider-Man: Beyond the Spider-Verse',
    ageRating: 'ATP',
    duration: 130,
    requestedRoomId: 'room-2',
    requestedStartTime: '15:30',
    emailBody: `Estimado Distribuidor,
Solicitamos material y autorización para programar el estreno de "Spider-Man: Beyond the Spider-Verse" en una de nuestras salas principales (Sala Grande B) con capacidad para 150 espectadores.
Proponemos un horario estelar de las 15:30 para asegurar una audiencia familiar amplia.
Quedamos atentos a la confirmación de la sala y asignación de franjas horarias.

Atentamente,
Administración del Cine`,
    status: 'Respondido',
    distributorReply: `Estimado Exhibidor,
Hemos revisado su propuesta para "Spider-Man: Beyond the Spider-Verse" en la Sala Grande B a las 15:30.
Su solicitud ha sido aprobada. Le adjuntamos las claves de encriptación del material del DCP que se habilitarán en la fecha correspondiente.
Agradecemos su preferencia.

Saludos,
Distribuidora de Contenidos LatAm`
  },
  {
    id: 'em-2',
    date: getTodayDateString(),
    movieTitle: 'Batman: The Dark Knight Resurrects',
    ageRating: '+16',
    duration: 160,
    requestedRoomId: 'room-1',
    requestedStartTime: '19:00',
    emailBody: `Estimado Distribuidor,
Solicitamos programar el material de "Batman" para el horario nocturno de las 19:00 en la Sala Grande A. Esperamos una acogida masiva del público fanático.
Saludos cordiales.`,
    status: 'Enviado'
  }
];
