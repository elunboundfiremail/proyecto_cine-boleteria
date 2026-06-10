/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Ticket, 
  MapPin, 
  Clock, 
  User, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  BadgePercent,
  Search,
  Check,
  Coins,
  QrCode,
  Printer
} from 'lucide-react';
import { Movie, Room, Show, TicketRef, PaymentMethod } from '../types';
import { SeatingMap } from './SeatingMap';

interface BoleteriaFisicaProps {
  movies: Movie[];
  rooms: Room[];
  shows: Show[];
  tickets: TicketRef[];
  setTickets: React.Dispatch<React.SetStateAction<TicketRef[]>>;
  selectedDate: string;
}

export default function BoleteriaFisica({
  movies,
  rooms,
  shows,
  tickets,
  setTickets,
  selectedDate
}: BoleteriaFisicaProps) {
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [selectedShowId, setSelectedShowId] = useState<string>('');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [clientNit, setClientNit] = useState<string>('');
  const [clientName, setClientName] = useState<string>('Consumidor Final');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  
  // Custom seating sequence toggle in ticket office
  const [seatingAssignmentMode, setSeatingAssignmentMode] = useState<'AUTO' | 'ORDEN_LLEGADA'>('ORDEN_LLEGADA');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Reset seats when movie/show/date changes
  React.useEffect(() => {
    setSelectedSeats([]);
  }, [selectedMovieId, selectedShowId, selectedDate]);

  // Handle truncation on quantity adjustment
  React.useEffect(() => {
    if (selectedSeats.length > ticketCount) {
      setSelectedSeats(prev => prev.slice(0, ticketCount));
    }
  }, [ticketCount]);

  // Print simulator
  const [printedTickets, setPrintedTickets] = useState<TicketRef[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Filter active movies mapped to todays shows
  const activeMovies = movies.filter(m => 
    m.isActive && m.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // 2. Scheduled shows for today/tomorrow
  const availableShows = shows.filter(s => s.movieId === selectedMovieId);

  // Calculations
  const getShowOccupancy = (showId: string) => {
    const sold = tickets.filter(t => t.showId === showId && t.showDate === selectedDate).length;
    const show = shows.find(s => s.id === showId);
    const room = rooms.find(r => r.id === show?.roomId);
    const capacity = room ? room.capacity : 100;
    const percent = Math.round((sold / capacity) * 100);
    return { sold, capacity, percent };
  };

  const handleMovieSelect = (id: string) => {
    setSelectedMovieId(id);
    const related = shows.filter(s => s.movieId === id);
    if (related.length > 0) {
      setSelectedShowId(related[0].id);
    } else {
      setSelectedShowId('');
    }
    setPrintedTickets(null);
    setErrorMessage('');
  };

  const currentShow = shows.find(s => s.id === selectedShowId);
  const currentMovie = movies.find(m => m.id === selectedMovieId);

  const handleSellTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPrintedTickets(null);

    if (!selectedMovieId || !selectedShowId || !currentShow || !currentMovie) {
      setErrorMessage('⚠️ Por favor seleccione película y función.');
      return;
    }

    if (currentMovie.allowSeatSelection && selectedSeats.length !== ticketCount) {
      setErrorMessage(`⚠️ Error de boleto: Por favor, seleccione exactamente ${ticketCount} ${ticketCount === 1 ? 'butaca' : 'butacas'} en el mapa.`);
      return;
    }

    const { sold, capacity, percent } = getShowOccupancy(selectedShowId);
    if (sold + ticketCount > capacity) {
      setErrorMessage(`⚠️ Error de boleto: No quedan asientos suficientes en sala para esta cantidad de entradas. Quedan: ${capacity - sold}`);
      return;
    }

    // Determine 2x1 eligibility
    const isPromoActive = percent < 30; // dynamic 2x1 trigger

    let finalPricePaid = 0;
    if (isPromoActive) {
      const pairs = Math.floor(ticketCount / 2);
      const remainder = ticketCount % 2;
      finalPricePaid = (pairs + remainder) * currentShow.price;
    } else {
      finalPricePaid = ticketCount * currentShow.price;
    }

    // Generate seats details
    const seatLabels: string[] = [];
    const baseSeatIndex = sold + 1;

    if (currentMovie.allowSeatSelection) {
      seatLabels.push(...selectedSeats);
    } else {
      if (seatingAssignmentMode === 'AUTO') {
        for (let i = 0; i < ticketCount; i++) {
          const seatIndex = baseSeatIndex + i;
          const rowLetter = String.fromCharCode(65 + Math.floor((seatIndex - 1) / 10)); // Rows A, B, C...
          const seatNoInRow = ((seatIndex - 1) % 10) + 1;
          seatLabels.push(`Fila ${rowLetter}-Asiento ${seatNoInRow}`);
        }
      } else {
        seatLabels.push(`Ingreso General #${baseSeatIndex} al #${baseSeatIndex + ticketCount - 1} - Por Orden de Llegada`);
      }
    }

    const room = rooms.find(r => r.id === currentShow.roomId);

    // Create the physical ticket
    const newTicket: TicketRef = {
      id: `tk-fis-${Date.now()}-${Math.floor(Math.random() * 900)}`,
      showId: selectedShowId,
      showDate: selectedDate,
      movieTitle: currentMovie.title,
      roomName: room?.name || 'Sala General',
      startTime: currentShow.startTime,
      pricePaid: finalPricePaid,
      nit: clientNit || '9902140', // Standard or chosen NIT
      clientName: clientName || 'Consumidor Final',
      paymentMethod: paymentMethod,
      channel: 'Fisica',
      isPromo2x1: isPromoActive,
      seatNumbers: seatLabels,
      timestamp: new Date().toISOString()
    };

    setTickets(prev => [...prev, newTicket]);
    setPrintedTickets([newTicket]);
    
    // Clear fields
    setClientName('Consumidor Final');
    setClientNit('');
    setTicketCount(1);
    setSelectedSeats([]);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-4 md:p-6 font-sans flex flex-col justify-between" id="boxoffice-main">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* Terminal Header */}
        <div className="border-b border-slate-800 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-xs bg-red-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-widest text-white animate-pulse">
              BOLETERÍA PRESENCIAL
            </span>
            <h2 className="text-2xl font-black mt-2 tracking-tight flex items-center gap-2">
              <Ticket className="w-6 h-6 text-red-500" />
              Punto de Venta Foyer #1
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-slate-400">
              Cajero: OPERADOR_01
            </span>
            <span className="text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-900 px-3 py-1.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              Impresora de Boletos: Conectada
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT 1/3: MOVIE CHOOSE LIST */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buscar Película</span>
                <span className="text-[10px] text-slate-500">{activeMovies.length} En Cartelera</span>
              </div>
              <div className="relative text-xs">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Escribe título de película..." 
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 placeholder-slate-600 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
            </div>

            {/* Movie Selector Grid list */}
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1" id="movies-terminal-scroll">
              {activeMovies.map(movie => {
                const isSelected = movie.id === selectedMovieId;
                return (
                  <button
                    key={movie.id}
                    onClick={() => handleMovieSelect(movie.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex gap-3 ${
                      isSelected 
                        ? 'bg-red-950/40 border-red-600 text-white' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <img 
                      src={movie.posterUrl} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      className="w-12 h-16 object-cover rounded bg-slate-950" 
                    />
                    <div className="overflow-hidden min-w-0">
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded uppercase">
                        {movie.ageRating}
                      </span>
                      <h4 className="font-extrabold text-sm truncate mt-1">{movie.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{movie.genre}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MIDDLE 1/3: BOOKING SETTINGS FORM */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
            <h3 className="font-black text-slate-100 text-base mb-4 border-b border-slate-800 pb-2">
              Configuración de Venta
            </h3>

            {currentMovie ? (
              <form onSubmit={handleSellTicket} className="space-y-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Película Seleccionada</span>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-200">
                    <p className="font-extrabold text-[13px] text-white leading-normal">{currentMovie.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Clasificación: {currentMovie.ageRating} | Duración: {currentMovie.duration}m</p>
                  </div>
                </div>

                {/* Showtimes for selected movie only */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Función de Hoy</span>
                  {availableShows.length === 0 ? (
                    <p className="text-indigo-400 bg-slate-900 p-2.5 rounded border border-slate-800 italic">
                      ⚠️ No se programaron horarios asignados para esta película hoy. Pero recuerda: si no programas, se repiten funciones del día anterior. Use el panel "Programar" para agendar.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableShows.map(show => {
                        const { sold, capacity, percent } = getShowOccupancy(show.id);
                        const isPromoActive = percent < 30;
                        const isShowSelected = selectedShowId === show.id;

                        return (
                          <button
                            key={show.id}
                            type="button"
                            onClick={() => { setSelectedShowId(show.id); setPrintedTickets(null); }}
                            className={`p-2 rounded border text-left transition-all flex flex-col justify-between ${
                              isShowSelected
                                ? 'bg-red-600/20 border-red-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span className="font-bold text-slate-100 block">{show.startTime} hrs</span>
                            <div className="text-[9px] text-slate-500 mt-1 flex justify-between items-center w-full">
                              <span>Ocup.: {percent}%</span>
                              {isPromoActive && (
                                <span className="bg-emerald-950 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded text-[8px] tracking-wide animate-pulse border border-emerald-900">
                                  2x1
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {currentShow && (
                  <>
                    {/* Dynamic Auto Promotion alert trigger - "2x1 cuando baje el 70 de la sala" (<30% occupied) */}
                    {getShowOccupancy(currentShow.id).percent < 30 ? (
                      <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 p-3 rounded-lg flex items-start gap-2">
                        <BadgePercent className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="font-extrabold block text-emerald-200">Doble Boleto (2x1) Habilitado</span>
                          La sala está con baja asistencia ({getShowOccupancy(currentShow.id).percent}%). Aplica promoción automática 2x1 en caja.
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950 p-2 text-slate-500 text-[10px]">
                        Tarifa Normal. Ocupación en {getShowOccupancy(currentShow.id).percent}%. Promo 2x1 suspendida.
                      </div>
                    )}

                    {/* Choose seating sequence type - Fulfills seating logic */}
                    {!currentMovie?.allowSeatSelection && (
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Manejo de Asientos</span>
                        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setSeatingAssignmentMode('ORDEN_LLEGADA')}
                            className={`py-1.5 rounded text-[10px] font-bold ${
                              seatingAssignmentMode === 'ORDEN_LLEGADA'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Orden de Llegada
                          </button>
                          <button
                            type="button"
                            onClick={() => setSeatingAssignmentMode('AUTO')}
                            className={`py-1.5 rounded text-[10px] font-bold ${
                              seatingAssignmentMode === 'AUTO'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Sugerencia Fila/Asiento
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Cantidad</span>
                        <input 
                          type="number" 
                          value={ticketCount}
                          onChange={e => setTicketCount(Math.max(1, Number(e.target.value)))}
                          min={1}
                          className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm text-center text-white"
                          required
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">CI / NIT Cliente</span>
                        <input 
                          type="text" 
                          placeholder="Ej: 9023412" 
                          value={clientNit}
                          onChange={e => setClientNit(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm text-white placeholder-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre Factura</span>
                      <input 
                        type="text" 
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm text-white"
                        required
                      />
                    </div>

                    {currentMovie?.allowSeatSelection && (
                      <div className="pt-2">
                        <SeatingMap
                          showId={currentShow.id}
                          showDate={selectedDate}
                          capacity={rooms.find(r => r.id === currentShow.roomId)?.capacity || 100}
                          roomName={rooms.find(r => r.id === currentShow.roomId)?.name || 'Sala'}
                          tickets={tickets}
                          selectedSeats={selectedSeats}
                          onChangeSelectedSeats={setSelectedSeats}
                          requiredCount={ticketCount}
                        />
                      </div>
                    )}

                    {/* Physical Payment Methods - QR and Cash (Efectivo) */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Medio de Pago Presencial</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('Efectivo')}
                          className={`py-2 rounded border font-bold flex items-center justify-center gap-1.5 ${
                            paymentMethod === 'Efectivo'
                              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          <Coins className="w-4 h-4" />
                          Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('QR')}
                          className={`py-2 rounded border font-bold flex items-center justify-center gap-1.5 ${
                            paymentMethod === 'QR'
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          Escaneo QR
                        </button>
                      </div>
                    </div>

                    {/* Total bs calculation */}
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center mt-3">
                      <span className="text-slate-500 text-[10px]">TOTAL CAJA:</span>
                      <span className="font-extrabold text-white text-lg font-mono">
                        {(() => {
                          const isPromo = getShowOccupancy(currentShow.id).percent < 30;
                          if (isPromo) {
                            const pairs = Math.floor(ticketCount / 2);
                            const remainder = ticketCount % 2;
                            return (pairs + remainder) * currentShow.price;
                          }
                          return ticketCount * currentShow.price;
                        })()}{' '}
                        Bs.
                      </span>
                    </div>

                    {errorMessage && (
                      <div className="bg-red-950/40 border border-red-900 text-red-400 p-2.5 rounded text-[11px]">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-lg transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Emitir & Imprimir Boleto Físico
                    </button>
                  </>
                )}
              </form>
            ) : (
              <div className="text-center py-12 text-slate-600 font-mono text-xs">
                Seleccione una película de la cartelera del panel izquierdo para configurar el boleto del cliente físico.
              </div>
            )}
          </div>

          {/* RIGHT 1/3: PRINT PREVIEW BOLETO FÍSICO */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="font-black text-slate-100 text-base mb-2 flex items-center gap-1">
              <span>🖨️ Previsualización de Impresión</span>
              <span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded uppercase font-mono font-normal">
                Boleto Térmico
              </span>
            </h3>

            {printedTickets ? (
              printedTickets.map(t => (
                <div 
                  key={t.id} 
                  className="bg-white text-slate-900 p-5 rounded shadow-xl font-mono text-xs border border-slate-200 relative w-full overflow-hidden"
                  id="printed-ticket-body"
                >
                  {/* Decorative thermal cuts */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(90deg,_#000_50%,_transparent_50%)] bg-[length:10px_10px]"></div>
                  
                  <div className="text-center space-y-1 mb-4 pb-3 border-b border-dashed border-slate-300">
                    <h4 className="font-black text-[13px] tracking-tight text-slate-950">*** CINEMA PREMIUM ***</h4>
                    <p className="text-[9px] font-sans text-slate-500">SUCURSAL CENTRAL - BOLETERÍA FÍSICA</p>
                    <p className="text-[8px] text-slate-400 font-sans">Emitido: {t.timestamp.replace('T',' ').substring(0, 19)}</p>
                  </div>

                  <div className="space-y-2 text-[11px] leading-relaxed">
                    <p><strong className="text-slate-500 font-sans uppercase text-[9px] block">Código Entrada:</strong> <span className="font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded font-mono">{t.id}</span></p>
                    <p><strong className="text-slate-500 font-sans uppercase text-[9px] block">Película:</strong> <span className="font-extrabold text-sm text-slate-950 leading-tight block">{t.movieTitle}</span></p>
                    
                    <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-100 pt-2">
                      <p><strong className="text-slate-500 font-sans uppercase text-[9px] block">Sala:</strong> <span className="font-bold">{t.roomName}</span></p>
                      <p><strong className="text-slate-500 font-sans uppercase text-[9px] block">Hora Show:</strong> <span className="font-bold text-slate-900 font-mono text-sm">{t.startTime} Bs.</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-100 pt-2">
                      <p><strong className="text-slate-400 font-sans uppercase text-[9px] block">NIT/CI:</strong> <span className="font-bold font-mono text-slate-800">{t.nit}</span></p>
                      <p><strong className="text-slate-400 font-sans uppercase text-[9px] block">Señor(a):</strong> <span className="font-bold text-slate-800 truncate block">{t.clientName}</span></p>
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-2 mt-4">
                      <strong className="text-slate-500 font-sans uppercase text-[9px] block">Manejo Asignación:</strong>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                        {t.seatNumbers.map((s, i) => (
                          <span key={i} className="block font-black text-slate-950 text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="text-[8px] text-slate-400 leading-normal mt-1.5 font-sans">
                        Conserve este ticket térmico oficial para control de ingreso de sala. Ley 843 de Impuestos Nacionales.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-dashed border-slate-300 text-center flex flex-col items-center">
                    {t.isPromo2x1 && (
                      <span className="text-[10px] font-black tracking-tight text-white bg-slate-900 px-3 py-1 rounded-full mb-2">
                        🎁 BENEFICIO 2x1 CASILLERO
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 block font-sans">MEDIO: {t.paymentMethod}</span>
                    <span className="text-slate-950 font-black text-base mt-1">TOTAL BS: {t.pricePaid} Bs.</span>
                  </div>

                  {/* Simulated barcode */}
                  <div className="mt-5 flex flex-col items-center">
                    <div className="w-full h-8 bg-[repeating-linear-gradient(90deg,_#000,_#000_2px,_#fff_2px,_#fff_4px)]"></div>
                    <span className="text-[8px] text-slate-400 mt-1 font-mono">{t.id.toUpperCase()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-xl p-8 text-center text-slate-600 font-mono text-xs">
                Aquí aparecerá el boleto impreso oficial una vez que presione "Emitir Entrada" en la registradora.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
