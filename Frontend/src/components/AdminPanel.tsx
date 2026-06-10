/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Film, 
  Calendar, 
  Mail, 
  TrendingUp, 
  Plus, 
  Users, 
  Ticket, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  RefreshCw,
  Send,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { Movie, Room, Show, TicketRef, DistributorEmail, PaymentMethod } from '../types';
import { getEndTimeWithBuffer, timeToMinutes, minutesToTime } from '../data';

interface AdminPanelProps {
  movies: Movie[];
  setMovies: React.Dispatch<React.SetStateAction<Movie[]>>;
  rooms: Room[];
  shows: Show[];
  setShows: React.Dispatch<React.SetStateAction<Show[]>>;
  tickets: TicketRef[];
  setTickets: React.Dispatch<React.SetStateAction<TicketRef[]>>;
  emails: DistributorEmail[];
  setEmails: React.Dispatch<React.SetStateAction<DistributorEmail[]>>;
  selectedDate: string;
}

export default function AdminPanel({
  movies,
  setMovies,
  rooms,
  shows,
  setShows,
  tickets,
  setTickets,
  setEmails,
  emails,
  selectedDate
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'shows' | 'emails' | 'movies'>('metrics');

  // --- SHOW PROGRAMMING STATE ---
  const [newShowMovieId, setNewShowMovieId] = useState(movies[0]?.id || '');
  const [newShowRoomId, setNewShowRoomId] = useState(rooms[0]?.id || '');
  const [newShowStartTime, setNewShowStartTime] = useState('14:00');
  const [newShowPrice, setNewShowPrice] = useState(40);
  const [newShowDate, setNewShowDate] = useState(selectedDate);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  // --- DISTRIBUTOR EMAIL STATE ---
  const [emailMovieTitle, setEmailMovieTitle] = useState('');
  const [emailAgeRating, setEmailAgeRating] = useState<'ATP' | '+13' | '+16' | '+18'>('ATP');
  const [emailDuration, setEmailDuration] = useState(120);
  const [emailRoomId, setEmailRoomId] = useState(rooms[0]?.id || '');
  const [emailStartTime, setEmailStartTime] = useState('18:00');
  const [emailSuccess, setEmailSuccess] = useState('');

  // --- NEW MOVIE STATE ---
  const [movieTitle, setMovieTitle] = useState('');
  const [moviePoster, setMoviePoster] = useState('');
  const [movieClass, setMovieClass] = useState<'ATP' | '+13' | '+16' | '+18'>('ATP');
  const [movieDuration, setMovieDuration] = useState(120);
  const [movieGenre, setMovieGenre] = useState('');
  const [movieSynopsis, setMovieSynopsis] = useState('');
  const [movieSuccess, setMovieSuccess] = useState('');
  const [movieAllowSeatSelection, setMovieAllowSeatSelection] = useState(false);

  // --- METRICS CALCULATION ---
  // Over overall period
  const totalRevenue = tickets.reduce((sum, t) => sum + t.pricePaid, 0);
  const totalTicketsSold = tickets.length;
  
  // Group tickets by show for today's dynamic occupancy metrics
  const getShowOccupancy = (showId: string, showDate: string) => {
    const sold = tickets.filter(t => t.showId === showId && t.showDate === showDate).length;
    const show = shows.find(s => s.id === showId);
    const room = rooms.find(r => r.id === show?.roomId);
    const capacity = room ? room.capacity : 100;
    const percent = Math.round((sold / capacity) * 100);
    return { sold, capacity, percent };
  };

  // Movie metrics tracker
  const moviePerformances = movies.map(movie => {
    const movieShowsIds = shows.filter(s => s.movieId === movie.id).map(s => s.id);
    const movieTickets = tickets.filter(t => movieShowsIds.includes(t.showId));
    const revenue = movieTickets.reduce((sum, t) => sum + t.pricePaid, 0);
    const ticketsCount = movieTickets.length;
    
    // Calculate average occupancy
    let totalCap = 0;
    let totalSold = 0;
    shows.filter(s => s.movieId === movie.id).forEach(show => {
      const room = rooms.find(r => r.id === show.roomId);
      if (room) {
        totalCap += room.capacity;
        // Count sold on dates that have tickets for this show
        const uniqueDates = Array.from(new Set(tickets.filter(t => t.showId === show.id).map(t => t.showDate)));
        // Include today in count if not present
        if (!uniqueDates.includes(selectedDate)) {
          uniqueDates.push(selectedDate);
        }
        uniqueDates.forEach(date => {
          totalSold += tickets.filter(t => t.showId === show.id && t.showDate === date).length;
        });
      };
    });

    const avgOccupancy = totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0;

    return {
      id: movie.id,
      title: movie.title,
      genre: movie.genre,
      isActive: movie.isActive,
      revenue,
      ticketsCount,
      avgOccupancy
    };
  });

  // --- SHOW PROGRAMMING CONSTRAINTS CHECK ---
  const handleCreateShow = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError('');
    setScheduleSuccess('');

    // 1. Operating Hours Constraint: 2 PM (14:00) to 10 PM (22:00)
    const startMin = timeToMinutes(newShowStartTime);
    const minHourMin = timeToMinutes('14:00');
    const maxHourMin = timeToMinutes('22:00');

    if (startMin < minHourMin || startMin > maxHourMin) {
      setScheduleError('⚠️ Los horarios permitidos de inicio de función son de 2:00 PM (14:00) a 10:00 PM (22:00).');
      return;
    }

    const movie = movies.find(m => m.id === newShowMovieId);
    if (!movie) return;

    // Calculate buffer end time for the new show
    const duration = movie.duration;
    const newEndTimeWithBuffer = getEndTimeWithBuffer(newShowStartTime, duration);
    const endMin = timeToMinutes(newEndTimeWithBuffer);

    // 2. Conflict & Clean Room Constraint: Check overlaps in same room for same date
    // (If shows are scheduled, they shouldn't overlap. Take in mind previous show end plus 15 mins which is already included in getEndTimeWithBuffer)
    const existingShowsInRoom = shows.filter(s => s.roomId === newShowRoomId && s.date === newShowDate);
    
    let hasConflict = false;
    let conflictDetails = '';

    for (const show of existingShowsInRoom) {
      const existingStart = timeToMinutes(show.startTime);
      const existingEnd = timeToMinutes(show.endTime); // includes its own 15 min buffer

      // Check overlap: new start is between existing show, or new end covers existing show
      // A show R overlaps with S if: R.start < S.end AND S.start < R.end
      if (startMin < existingEnd && existingStart < endMin) {
        hasConflict = true;
        const confMovie = movies.find(m => m.id === show.movieId)?.title || 'Película';
        conflictDetails = `Conflicto con la función de "${confMovie}" (${show.startTime} - ${show.endTime.substring(0, 5)} con intervalo de 15m).`;
        break;
      }
    }

    if (hasConflict) {
      setScheduleError(`⚠️ No se puede programar en esta sala: ${conflictDetails}`);
      return;
    }

    // Success - Create the show
    const newShow: Show = {
      id: `show-custom-${Date.now()}`,
      movieId: newShowMovieId,
      roomId: newShowRoomId,
      startTime: newShowStartTime,
      endTime: newEndTimeWithBuffer,
      date: newShowDate,
      price: Number(newShowPrice)
    };

    setShows(prev => [...prev, newShow]);
    setScheduleSuccess('¡Función programada con éxito con espacio de limpieza de 15 minutos en la sala!');
  };

  // --- DISTRIBUTOR SIMULATION ---
  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailMovieTitle) return;

    const selectedRoom = rooms.find(r => r.id === emailRoomId);

    const emailBody = `Estimado Distribuidor,
Solicitamos habilitar la película "${emailMovieTitle}" (Clasificación: ${emailAgeRating}, Duración: ${emailDuration} min) para proyectarse en nuestro establecimiento.
Proponemos asignarla a la ${selectedRoom?.name || 'Sala'} en el horario inicial sugerido de las ${emailStartTime}. 

Quedamos a la espera de la asignación oficial de sala y confirmación de franjas horarias.

Atentamente,
Administración Cinema Premium`;

    const newEmail: DistributorEmail = {
      id: `em-${Date.now()}`,
      date: selectedDate,
      movieTitle: emailMovieTitle,
      ageRating: emailAgeRating,
      duration: Number(emailDuration),
      requestedRoomId: emailRoomId,
      requestedStartTime: emailStartTime,
      emailBody,
      status: 'Enviado'
    };

    setEmails(prev => [newEmail, ...prev]);
    setEmailSuccess('¡Correo enviado a la distribuidora! Ahora puedes simular su respuesta en la bandeja.');
    setEmailMovieTitle('');
  };

  const handleSimulateReply = (emailId: string) => {
    setEmails(prev => prev.map(em => {
      if (em.id !== emailId) return em;
      
      const isApproved = Math.random() > 0.3; // 70% approval rate
      const reply = isApproved 
        ? `Estimado Exhibidor,
Hemos recibido su solicitud para estrenar "${em.movieTitle}". Nos complace informarles que la propuesta cumple con nuestros estándares de distribución regional para un público de clasificación ${em.ageRating}.
Queda autorizado el uso de material publicitario (Portes) y la asignación sugerida. Las llaves KDM para habilitar el reproductor se enviarán 12 horas antes.

Saludos de Distribución`
        : `Estimado Exhibidor,
De momento, el título "${em.movieTitle}" se encuentra bajo exclusividad de salas capitalinas y no podemos otorgar licencias en preventa para la sala solicitada en este horario.
Por favor, sugiera un horario alterno posterior a las 20:00 o una sala de menor capacidad.

Atentamente,
Distribuidora LatAm`;

      return {
        ...em,
        status: 'Respondido',
        distributorReply: reply
      };
    }));
  };

  // --- ADD NEW MOVIE FROM DISTRIBUTOR APPROVED OR MANUAL ---
  const handleAddMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle) return;

    const newMovie: Movie = {
      id: `movie-manual-${Date.now()}`,
      title: movieTitle,
      posterUrl: moviePoster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      ageRating: movieClass,
      duration: Number(movieDuration),
      genre: movieGenre || 'Género Cine',
      synopsis: movieSynopsis || 'Sinopsis por registrar de la distribuidora.',
      isActive: true,
      allowSeatSelection: movieAllowSeatSelection
    };

    setMovies(prev => [...prev, newMovie]);
    setMovieSuccess(`¡La película "${movieTitle}" se ha añadido con éxito a la cartelera!`);
    setMovieTitle('');
    setMoviePoster('');
    setMovieGenre('');
    setMovieSynopsis('');
    setMovieAllowSeatSelection(false);
  };

  const toggleMovieActive = (id: string) => {
    setMovies(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  const toggleMovieSeatsSelection = (id: string) => {
    setMovies(prev => prev.map(m => m.id === id ? { ...m, allowSeatSelection: !m.allowSeatSelection } : m));
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-6 text-slate-800 font-sans" id="admin-main">
      <div className="max-w-7xl mx-auto">
        
        {/* Sub Header & Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="admin-banner">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">⚙️ Panel de Administración</h2>
            <p className="text-slate-300 text-sm mt-1">
              Supervisión de salas, programación horaria, métricas de retención y despacho de correos a distribuidoras.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-full font-mono border border-slate-700">
              Operación: 14:00 - 22:00
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1.5 rounded-full font-semibold border border-indigo-500/30">
              Intervalo Limpieza: 15min
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 font-medium gap-2 overflow-x-auto pb-1" id="admin-tabs">
          <button
            id="tab-metrics"
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all shrink-0 ${
              activeTab === 'metrics' 
                ? 'bg-slate-950 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Métricas y Cartelera
          </button>
          <button
            id="tab-shows"
            onClick={() => setActiveTab('shows')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all shrink-0 ${
              activeTab === 'shows' 
                ? 'bg-slate-950 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Programar Funciones
          </button>
          <button
            id="tab-emails"
            onClick={() => setActiveTab('emails')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all shrink-0 ${
              activeTab === 'emails' 
                ? 'bg-slate-950 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-4 h-4" />
            Bandeja Distribuidora
          </button>
          <button
            id="tab-movies"
            onClick={() => setActiveTab('movies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all shrink-0 ${
              activeTab === 'movies' 
                ? 'bg-slate-950 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Film className="w-4 h-4" />
            Catálogo / Filtros
          </button>
        </div>

        {/* --- METRICS CONTENT --- */}
        {activeTab === 'metrics' && (
          <div className="space-y-6" id="metrics-content">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200" id="card-rev">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Ingresos Totales</span>
                  <Ticket className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{totalRevenue} Bs.</div>
                <p className="text-xs text-slate-500 mt-1">Recaudación acumulada general</p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200" id="card-tickets">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Boletos Vendidos</span>
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{totalTicketsSold}</div>
                <p className="text-xs text-slate-500 mt-1">Entradas físicas + digitales</p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200" id="card-occupancy">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Formatos de Salas</span>
                  <MapPin className="w-5 h-5 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">4 Salas</div>
                <p className="text-xs text-slate-500 mt-1">2 Grandes, 1 Media, 1 Pequeña</p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 animate-pulse" id="card-promo">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Trigger Promocional</span>
                  <Percent className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-950">2x1 Automático</div>
                <p className="text-xs text-slate-500 mt-1">Activo si la sala baja del 30%</p>
              </div>
            </div>

            {/* Business Intelligence Decision-Making Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="decision-making">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Desempeño Cinematográfico y Decisiones de Cartelera</h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Métricas dinámicas para evaluar el éxito de un filme. Si un título rinde bajo, se recomienda dar de baja o promover 2x1.
                  </p>
                </div>
                <span className="text-xs font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                  Fecha evaluada: {selectedDate}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                      <th className="py-3 px-4">Filme</th>
                      <th className="py-3 px-4">Ocupación Promedio</th>
                      <th className="py-3 px-4">Boletos</th>
                      <th className="py-3 px-4">Ingresos Bs.</th>
                      <th className="py-3 px-4">Acción Recomendada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moviePerformances.map((perf) => {
                      const isLow = perf.avgOccupancy < 40 && perf.ticketsCount > 0;
                      const isHigh = perf.avgOccupancy >= 60;
                      const isNew = perf.ticketsCount === 0;

                      return (
                        <tr key={perf.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                          <td className="py-4 px-4 font-semibold text-slate-900">
                            {perf.title}
                            {!perf.isActive && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactiva (Fuera de Cartelera)</span>}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isHigh ? 'bg-emerald-500' : isLow ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${perf.avgOccupancy}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-xs text-slate-700">{perf.avgOccupancy}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono">{perf.ticketsCount} un.</td>
                          <td className="py-4 px-4 font-mono font-semibold text-slate-900">{perf.revenue} Bs.</td>
                          <td className="py-4 px-4">
                            {!perf.isActive ? (
                              <button 
                                onClick={() => toggleMovieActive(perf.id)}
                                className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded transition-colors"
                              >
                                Volver a Habilitar
                              </button>
                            ) : isHigh ? (
                              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-md border border-emerald-100 inline-flex items-center gap-1">
                                🔥 Mantener & Expandir
                              </span>
                            ) : isLow ? (
                              <div className="flex flex-col gap-1 sm:flex-row items-start">
                                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-md border border-emerald-100 inline-flex items-center gap-1">
                                  🎟️ Baja Ocupación (2x1 Activo)
                                </span>
                                <button 
                                  onClick={() => toggleMovieActive(perf.id)}
                                  className="text-[10px] text-red-600 underline hover:text-red-800"
                                >
                                  Retirar
                                </button>
                              </div>
                            ) : isNew ? (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                🆕 Recién agregada
                              </span>
                            ) : (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                                Estable (Monitorizar)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Schedule Show Status Table */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="shows-today-status">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Estado de Funciones Programadas para Hoy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shows.filter(s => s.date === selectedDate || s.date === 'base').map((show) => {
                  const movie = movies.find(m => m.id === show.movieId);
                  const room = rooms.find(r => r.id === show.roomId);
                  const { sold, capacity, percent } = getShowOccupancy(show.id, selectedDate);
                  const isPromoActive = percent < 30; // 2x1 dynamic trigger!
                  
                  if (!movie?.isActive) return null;

                  return (
                    <div 
                      key={show.id} 
                      className={`p-4 rounded-xl border ${isPromoActive ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-100'} hover:shadow-md transition-all flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900 text-sm line-clamp-1">{movie?.title}</span>
                          <span className="bg-slate-200 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                            {movie?.ageRating}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                          <p className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                            {room?.name} <span className="text-slate-400">({room?.capacity} asientos)</span>
                          </p>
                          <p className="flex items-center gap-1.5 font-mono text-slate-700 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            {show.startTime} hrs - {show.endTime.substring(0, 5)} hrs
                          </p>
                          <p className="font-medium text-slate-900">Precio: {show.price} Bs.</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/60 pt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Ocupación actual:</span>
                          <span className="font-bold text-slate-800">{sold}/{capacity} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                          <div 
                            className={`h-full rounded-full ${isPromoActive ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>

                        {isPromoActive ? (
                          <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded inline-flex items-center gap-1 border border-emerald-200 animate-pulse">
                            🔥 ¡Promo 2x1 Activada! (Menor a 30%)
                          </div>
                        ) : (
                          <div className="text-[10px] font-medium text-slate-500">
                            Tarifa Regular
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AUDITORÍA DE BOLETERÍA - DEPURA REGISTROS PARA PRODUCCION */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8" id="ticket-auditing-panel">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-indigo-600" />
                    Auditoría de Ventas y Boletería (Registros de Producción)
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Depure, anule o elimine boletos de prueba individuales para garantizar que no existan interferencias ni duplicados antes de vincular tu backend definitivo.
                  </p>
                </div>
                {tickets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Estás seguro de que deseas ELIMINAR TODOS los boletos registrados? Esta acción dejará los reportes financieros en cero.")) {
                        setTickets([]);
                      }
                    }}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold border border-red-200 transition-all cursor-pointer"
                  >
                    🗑️ Vaciar Todas las Ventas
                  </button>
                )}
              </div>

              {tickets.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500 border border-dashed border-slate-200">
                  <p className="text-sm font-semibold">No se encontraron ventas de boletos registradas en esta sesión.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Los nuevos tiques emitidos en la boletería física o portal del cliente se enlistarán aquí en tiempo real.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase bg-slate-50">
                        <th className="py-2.5 px-3">Boleto ID</th>
                        <th className="py-2.5 px-3">Película</th>
                        <th className="py-2.5 px-3">Ubicación</th>
                        <th className="py-2.5 px-3">Cliente / NIT</th>
                        <th className="py-2.5 px-3 text-center">Canal</th>
                        <th className="py-2.5 px-3 text-center">Asientos</th>
                        <th className="py-2.5 px-3 text-right">Recaudado</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tickets.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/85">
                          <td className="py-3 px-3 font-mono font-bold text-slate-500">#{t.id.substring(6, 14)}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{t.movieTitle}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{t.showDate}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="block font-medium">{t.roomName}</span>
                            <span className="text-slate-500 font-mono text-[10px]">{t.startTime} Hrs</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="block font-bold text-slate-800">{t.clientName}</span>
                            <span className="text-slate-400 font-mono">NIT: {t.nit}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.channel === 'Online' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {t.channel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-wrap gap-0.5 justify-center max-w-[150px] mx-auto">
                              {t.seatNumbers.map((seat, i) => (
                                <span key={i} className="bg-slate-100 text-[9px] font-semibold px-1 py-0.5 rounded border border-slate-205 text-slate-705">
                                  {seat.replace('Fila ', '').replace('Asiento ', '')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{t.pricePaid} Bs.</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Anular y rembolsar el boleto #${t.id.substring(6,14)} para "${t.movieTitle}"? Los asientos asociados se liberarán.`)) {
                                  setTickets(prev => prev.filter(item => item.id !== t.id));
                                }
                              }}
                              className="text-[10px] text-red-650 font-bold hover:underline bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-all cursor-pointer border border-red-100"
                            >
                              Anular Transacción
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- SHOWS PROGRAMMING TAB --- */}
        {activeTab === 'shows' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="shows-tab-content">
            {/* Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Nueva Función Especial
              </h3>
              
              <form onSubmit={handleCreateShow} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Película</label>
                  <select 
                    value={newShowMovieId} 
                    onChange={e => setNewShowMovieId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950"
                  >
                    {movies.filter(m => m.isActive).map(m => (
                      <option key={m.id} value={m.id}>{m.title} ({m.duration} min)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sala de Exposición</label>
                  <select 
                    value={newShowRoomId} 
                    onChange={e => setNewShowRoomId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} - Cap: {r.capacity} pax (Formato {r.size})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Día de Proyección</label>
                    <select 
                      value={newShowDate} 
                      onChange={e => setNewShowDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none"
                    >
                      <option value={selectedDate}>Hoy ({selectedDate})</option>
                      <option value={new Date(Date.now() + 86400000).toISOString().split('T')[0]}>
                        Mañana
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Inicio (14:00-22:00)</label>
                    <input 
                      type="time" 
                      value={newShowStartTime} 
                      onChange={e => setNewShowStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm text-slate-800 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Precio Boleto (Bs.)</label>
                  <input 
                    type="number" 
                    value={newShowPrice} 
                    onChange={e => setNewShowPrice(Number(e.target.value))}
                    min={15}
                    max={120}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800"
                    required
                  />
                </div>

                {scheduleError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium flex items-start gap-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{scheduleError}</span>
                  </div>
                )}

                {scheduleSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-medium flex items-start gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{scheduleSuccess}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-slate-900 border border-transparent hover:bg-slate-950 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Programar y Reservar Sala
                </button>
              </form>

              {/* Seating disclaimer requirement */}
              <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-800">
                <p className="font-bold mb-1">ℹ️ Configuración de Asientos</p>
                <p>
                  El sistema cuenta con <strong>Asignación Automática</strong> en boleta consecutiva para aminorar el tiempo de venta física. Adicionalmente, el ingreso libre por <strong>orden de llegada</strong> está habilitado por defecto para agilizar boletos en boletería.
                </p>
              </div>
            </div>

            {/* List of Shows Scheduled */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Grilla Horaria y Verificación de Limpieza</h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Visualizador de bloques horarios. El sistema exige un periodo de 15 minutos entre películas en la misma sala.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      // Trigger clean schedule reset to base repetitive showtimes
                      setShows(prev => prev.filter(s => s.id.startsWith('show-')));
                      setScheduleSuccess('Restablecido a las funciones repetitivas base.');
                    }}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Repetir Base
                  </button>
                </div>

                <div className="space-y-4">
                  {rooms.map(room => {
                    const roomShows = shows
                      .filter(s => s.roomId === room.id)
                      .sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                    return (
                      <div key={room.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            {room.name} <span className="text-xs text-slate-400 font-normal">({room.size}) - Cap: {room.capacity}</span>
                          </span>
                        </div>

                        {roomShows.length === 0 ? (
                          <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs p-3 rounded-md italic">
                            ⚠️ Sin funciones especiales programadas para hoy. Se repiten automáticamente las funciones diarias configuradas para mantener cartelera activa.
                          </div>
                        ) : (
                          <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                            {roomShows.map((s, idx) => {
                              const movie = movies.find(m => m.id === s.movieId);
                              if (!movie?.isActive) return null;

                              return (
                                <div key={s.id} className="relative bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                  {/* Dot */}
                                  <div className="absolute -left-[21px] top-4 w-2 h-2 rounded-full bg-indigo-600 border border-white"></div>
                                  
                                  <div>
                                    <span className="font-semibold text-slate-800 text-sm">{movie.title}</span>
                                    <div className="flex items-center gap-2 mt-1 text-slate-500 font-mono">
                                      <span className="font-bold text-indigo-700">{s.startTime} hrs</span>
                                      <span>&rarr;</span>
                                      <span>{s.endTime.substring(0, 5)} hrs <span className="text-[10px] text-amber-600 tracking-tight font-sans font-semibold">(incl. 15m lim.)</span></span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="bg-slate-100 font-medium text-[10px] px-2 py-1 text-slate-600 rounded">
                                      {movie.duration}m
                                    </span>
                                    <span className="bg-indigo-50 font-bold text-[10px] px-2 py-1 text-indigo-700 rounded border border-indigo-100 font-mono">
                                      {s.price} Bs.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`¿Estás seguro de que deseas eliminar esta función programada de "${movie.title}" a las ${s.startTime}?`)) {
                                          setShows(prev => prev.filter(item => item.id !== s.id));
                                        }
                                      }}
                                      className="bg-red-50 hover:bg-red-100 font-bold text-[11px] h-6 w-6 flex items-center justify-center text-red-700 rounded border border-red-100 cursor-pointer transition-all hover:scale-105"
                                      title="Quitar función de producción"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- DISTRIBUTOR MAILING TAB --- */}
        {activeTab === 'emails' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="emails-tab-content">
            {/* Create Request */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                Módulo Correo Distribución
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Redacte y despache correos formales a las distribuidoras cinematográficas para solicitar material promocional, pósteres oficiales y negociar los convenios de sala y franja horaria.
              </p>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título de Película Solicitada</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Deadpool & Wolverine" 
                    value={emailMovieTitle}
                    onChange={e => setEmailMovieTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Clasificación edad</label>
                    <select 
                      value={emailAgeRating} 
                      onChange={e => setEmailAgeRating(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800"
                    >
                      <option value="ATP">ATP</option>
                      <option value="+13">+13</option>
                      <option value="+16">+16</option>
                      <option value="+18">+18</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Duración (minutos)</label>
                    <input 
                      type="number" 
                      value={emailDuration}
                      onChange={e => setEmailDuration(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm text-slate-800"
                      min={60}
                      max={240}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sala Sugerida</label>
                    <select 
                      value={emailRoomId} 
                      onChange={e => setEmailRoomId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none"
                    >
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name.replace('Sala ','')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hora inicio sugerido</label>
                    <input 
                      type="time" 
                      value={emailStartTime}
                      onChange={e => setEmailStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm text-slate-800"
                      required
                    />
                  </div>
                </div>

                {emailSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-medium">
                    {emailSuccess}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Enviar Correo Solicitud
                </button>
              </form>
            </div>

            {/* Email Inbox and Actions */}
            <div className="lg:col-span-2 space-y-4" id="emails-list">
              <h3 className="font-bold text-lg text-slate-900">Bandeja de Entrada e Intercambios con Distribuidoras</h3>
              
              {emails.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 text-sm">
                  Sin correos de solicitud enviados. Despache un correo para iniciar el diálogo.
                </div>
              ) : (
                emails.map(em => (
                  <div key={em.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                    {/* Header */}
                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block">Solicitud: {em.movieTitle}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Enviado: {em.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {em.status === 'Enviado' && (
                          <span className="bg-sky-50 text-sky-700 font-bold text-[10px] px-2 py-0.5 rounded border border-sky-100">
                            Enviado - Esperando Respuesta
                          </span>
                        )}
                        {em.status === 'Respondido' && (
                          <span className="bg-emerald-50 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded border border-emerald-200">
                            Respondió Distribuidor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bodies */}
                    <div className="p-4 space-y-4">
                      {/* Outgoing Body */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                        <span className="text-[10px] text-indigo-700 uppercase font-bold tracking-wider float-right">De: Admin Cine</span>
                        <pre className="font-sans whitespace-pre-wrap text-slate-700">{em.emailBody}</pre>
                      </div>

                      {/* Reply Simulator Trigger */}
                      {em.status === 'Enviado' && (
                        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleSimulateReply(em.id)}
                            className="text-xs bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-slate-950 flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Simular Respuesta Distribuidora
                          </button>
                        </div>
                      )}

                      {/* Incoming Body */}
                      {em.status === 'Respondido' && em.distributorReply && (
                        <div className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 text-xs text-slate-800">
                          <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider float-right">Distribuidora Oficial</span>
                          <p className="font-bold text-slate-900 mb-1">Resp: Re: Solicitud de Material {em.movieTitle}</p>
                          <pre className="font-sans whitespace-pre-wrap text-slate-700">{em.distributorReply}</pre>

                          {/* Quick Add To Cartelera Button if approved */}
                          {!movies.some(m => m.title.toLowerCase() === em.movieTitle.toLowerCase()) && (
                            <div className="mt-3 bg-white p-3 rounded border border-emerald-100 flex justify-between items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-semibold text-slate-700">¿Deseas agregar esta película aprobada a cartelera de inmediato?</span>
                              <button 
                                onClick={() => {
                                  const newMovie: Movie = {
                                    id: `movie-dist-${Date.now()}`,
                                    title: em.movieTitle,
                                    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
                                    ageRating: em.ageRating,
                                    duration: em.duration,
                                    genre: 'Estreno Distribuidora',
                                    synopsis: `Título habilitado oficialmente por la distribuidora para la Sala ${rooms.find(r => r.id === em.requestedRoomId)?.name}.`,
                                    isActive: true
                                  };
                                  setMovies(prev => [...prev, newMovie]);
                                  // Program intermediate base showtime too
                                  const newShow: Show = {
                                    id: `show-dist-${Date.now()}`,
                                    movieId: newMovie.id,
                                    roomId: em.requestedRoomId,
                                    startTime: em.requestedStartTime,
                                    endTime: getEndTimeWithBuffer(em.requestedStartTime, em.duration),
                                    date: 'base',
                                    price: 40
                                  };
                                  setShows(prev => [...prev, newShow]);
                                  alert(`Se ha añadido "${em.movieTitle}" e inmediatamente programado el show base a las ${em.requestedStartTime}`);
                                }}
                                className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded transition-colors"
                              >
                                Añadir a Cartelera y Grilla base
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- MANUAL CATALOG ADD TAB --- */}
        {activeTab === 'movies' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="movies-tab-content">
            {/* Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Registrar Nueva Película
              </h3>

              <form onSubmit={handleAddMovie} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título</label>
                  <input 
                    type="text" 
                    value={movieTitle}
                    onChange={e => setMovieTitle(e.target.value)}
                    placeholder="Ej: Sonic 3: La Película" 
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Génere / Categoría</label>
                  <input 
                    type="text" 
                    value={movieGenre}
                    onChange={e => setMovieGenre(e.target.value)}
                    placeholder="Ej: Aventura, Familia" 
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Clasificación edad</label>
                    <select 
                      value={movieClass} 
                      onChange={e => setMovieClass(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800"
                    >
                      <option value="ATP">ATP (Todo Público)</option>
                      <option value="+13">+13 Años</option>
                      <option value="+16">+16 Años</option>
                      <option value="+18">+18 Años</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Duración (min)</label>
                    <input 
                      type="number" 
                      value={movieDuration}
                      onChange={e => setMovieDuration(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm text-slate-800"
                      min={10}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">URL de Portada (Póster)</label>
                  <input 
                    type="url" 
                    value={moviePoster}
                    onChange={e => setMoviePoster(e.target.value)}
                    placeholder="https://images.unsplash.com/..." 
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Opcional. Se asignará una imagen de cine por defecto si se deja en blanco.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sinopsis</label>
                  <textarea 
                    value={movieSynopsis}
                    onChange={e => setMovieSynopsis(e.target.value)}
                    placeholder="Escribe un breve resumen de la película..." 
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm text-slate-800 h-20"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg select-none">
                  <input 
                    type="checkbox" 
                    id="allow-seat-choice" 
                    checked={movieAllowSeatSelection}
                    onChange={e => setMovieAllowSeatSelection(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="allow-seat-choice" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Habilitar selección de butacas individuales
                  </label>
                </div>

                {movieSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-medium">
                    {movieSuccess}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm animate-pulse"
                >
                  <Film className="w-4 h-4" />
                  Agregar Directo a Cartelera
                </button>
              </form>
            </div>

            {/* Catalog Grid list with Switch Enable controls */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-lg text-slate-900">Estado de Exhibición de Películas en Cartelera</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {movies.map(movie => (
                  <div key={movie.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-3 h-full">
                    <img 
                      src={movie.posterUrl} 
                      alt={movie.title} 
                      referrerPolicy="no-referrer"
                      className="w-20 h-28 object-cover rounded-md flex-shrink-0 bg-slate-100 shadow-sm"
                    />
                    <div className="flex flex-col justify-between overflow-hidden">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="bg-slate-100 text-slate-700 font-bold text-[9px] px-1.5 py-0.5 rounded">
                            {movie.ageRating}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{movie.duration} min</span>
                        </div>
                        <h4 className="font-bold text-slate-950 text-sm truncate">{movie.title}</h4>
                        <p className="text-slate-500 text-xs truncate mt-0.5">{movie.genre}</p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Exhibición:</span>
                          <button
                            type="button"
                            onClick={() => toggleMovieActive(movie.id)}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all ${
                              movie.isActive 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-250' 
                                : 'bg-red-100 text-red-800 hover:bg-red-250'
                            }`}
                          >
                            {movie.isActive ? '🟢 Activa' : '🔴 Inactiva'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Butacas (Asientos):</span>
                          <button
                            type="button"
                            onClick={() => toggleMovieSeatsSelection(movie.id)}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all ${
                              movie.allowSeatSelection 
                                ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-150' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {movie.allowSeatSelection ? '💺 Habilitada' : '🎟️ Por Llegada'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-100">
                          <span className="text-xs font-semibold text-slate-500">Base Datos:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Estás completamente seguro de eliminar "${movie.title}" de la cartelera de producción? Se borrarán sus funciones programadas.`)) {
                                setMovies(prev => prev.filter(m => m.id !== movie.id));
                                setShows(prev => prev.filter(s => s.movieId !== movie.id));
                              }
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-md font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-all cursor-pointer"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
