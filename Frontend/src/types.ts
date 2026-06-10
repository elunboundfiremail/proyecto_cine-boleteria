/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Movie {
  id: string;
  title: string;
  posterUrl: string;
  ageRating: 'ATP' | '+13' | '+16' | '+18';
  duration: number; // in minutes
  genre: string;
  synopsis: string;
  isActive: boolean; // if false, removed from cartelera
  allowSeatSelection?: boolean; // if true, seating selection map is enabled
}

export interface Room {
  id: string;
  name: string;
  size: 'Grande 1' | 'Grande 2' | 'Media' | 'Pequeña';
  capacity: number;
}

export interface Show {
  id: string;
  movieId: string;
  roomId: string;
  startTime: string; // e.g., "14:30" (between 14:00 and 22:00)
  endTime: string;   // startTime + duration + 15 min buffer
  date: string;      // "base" or specifically "YYYY-MM-DD"
  price: number;
}

export type PaymentMethod = 'QR' | 'Efectivo';
export type ChannelType = 'Fisica' | 'Online';

export interface TicketRef {
  id: string;
  showId: string;
  showDate: string; // the specific date of attendance
  movieTitle: string;
  roomName: string;
  startTime: string;
  pricePaid: number;
  nit: string;
  clientName: string;
  paymentMethod: PaymentMethod;
  channel: ChannelType;
  isPromo2x1: boolean;
  seatNumbers: string[]; // e.g., ["Asiento A-5", "Asiento A-6"] or ["Orden Llegada 15"]
  timestamp: string;
}

export interface DistributorEmail {
  id: string;
  date: string;
  movieTitle: string;
  ageRating: 'ATP' | '+13' | '+16' | '+18';
  duration: number;
  requestedRoomId: string;
  requestedStartTime: string;
  emailBody: string;
  status: 'Enviado' | 'Programado' | 'Respondido';
  distributorReply?: string;
}

export type UserRole = 'client' | 'cashier' | 'admin';

export interface User {
  id: string;
  username: string;
  password?: string; // stored plainly or simple comparison for mockup
  role: UserRole;
  fullName: string;
  nit?: string;
  email?: string;
}
