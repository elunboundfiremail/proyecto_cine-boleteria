/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  QrCode, 
  CreditCard,
  CheckCircle2, 
  AlertCircle,
  Tag,
  Search,
  ChevronRight,
  Printer,
  Ticket
} from 'lucide-react';
import { Movie, Room, Show, TicketRef, PaymentMethod, User as UserType } from '../types';
import { getTodayDateString, getTomorrowDateString } from '../data';
import { SeatingMap } from './SeatingMap';

interface ClientPanelProps {
  movies: Movie[];
  rooms: Room[];
  shows: Show[];
  tickets: TicketRef[];
  setTickets: React.Dispatch<React.SetStateAction<TicketRef[]>>;
  selectedDate: string;
  currentUser?: UserType | null;
  onOpenAuth?: (tab: 'login' | 'register') => void;
}

export default function ClientPanel({
  movies,
  rooms,
  shows,
  tickets,
  setTickets,
  selectedDate,
  currentUser,
  onOpenAuth
}: ClientPanelProps) {
  // Can only buy for Today or Tomorrow
  const [targetDate, setTargetDate] = useState<string>(getTodayDateString());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [quant, setQuant] = useState<number>(1);
  const [clientName, setClientName] = useState<string>(currentUser?.fullName || '');
  const [clientNit, setClientNit] = useState<string>(currentUser?.nit || '');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  
  // Tracking guest actions
  const [searchGuestNit, setSearchGuestNit] = useState<string>('');
  const [recentGuestPurchases, setRecentGuestPurchases] = useState<TicketRef[]>([]);

  // New States for Payment validation simulation
  const [pendingPayment, setPendingPayment] = useState<{
    show: Show;
    movie: Movie;
    quant: number;
    clientName: string;
    clientNit: string;
    selectedSeats: string[];
    pricePaid: number;
    isPromoActive: boolean;
    date: string;
  } | null>(null);

  const [paymentStep, setPaymentStep] = useState<'qr_display' | 'verifying' | 'success'>('qr_display');
  const [paymentTimer, setPaymentTimer] = useState<number>(300); // 5 minutes

  // Countdown timer for payment verification window
  React.useEffect(() => {
    let interval: any;
    if (pendingPayment && paymentStep === 'qr_display' && paymentTimer > 0) {
      interval = setInterval(() => {
        setPaymentTimer(prev => prev - 1);
      }, 1000);
    } else if (paymentTimer === 0 && pendingPayment && paymentStep === 'qr_display') {
      alert("⏳ El código QR Simple de pago ha expirado por inactividad. Por favor, realiza tu reserva nuevamente.");
      setPendingPayment(null);
    }
    return () => clearInterval(interval);
  }, [pendingPayment, paymentStep, paymentTimer]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleConfirmQRTransfer = () => {
    if (!pendingPayment) return;
    
    setPaymentStep('verifying');
    
    // Simulate real bank check (ACH/Simple networks)
    setTimeout(() => {
      const { show, movie, quant, clientName, clientNit, selectedSeats, pricePaid, isPromoActive, date } = pendingPayment;
      const { sold } = getShowOccupancy(show.id);
      
      const formattedTimestamp = new Date().toISOString();
      const baseSeatIndex = sold + 1;

      const seatArray: string[] = [];
      if (movie.allowSeatSelection) {
        seatArray.push(...selectedSeats);
      } else {
        for (let i = 0; i < quant; i++) {
          const seatNo = baseSeatIndex + i;
          const rowLetter = String.fromCharCode(65 + Math.floor((seatNo - 1) / 10));
          const seatNumInRow = ((seatNo - 1) % 10) + 1;
          seatArray.push(`Fila ${rowLetter}-Asiento ${seatNumInRow}`);
        }
      }

      const orderString = `Entrada General # ${baseSeatIndex} al ${baseSeatIndex + quant - 1} - Por Orden de Llegada`;

      const newTicket: TicketRef = {
        id: `tk-ol-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        showId: show.id,
        showDate: date,
        movieTitle: movie.title,
        roomName: rooms.find(r => r.id === show.roomId)?.name || 'Sala General',
        startTime: show.startTime,
        pricePaid: pricePaid,
        nit: clientNit || 'C/F',
        clientName: clientName || 'Cliente Virtual',
        paymentMethod: 'QR',
        channel: 'Online',
        isPromo2x1: isPromoActive,
        seatNumbers: seatArray.length > 0 ? seatArray : [orderString],
        timestamp: formattedTimestamp
      };

      // Set ticket as complete in persistence
      setTickets(prev => [...prev, newTicket]);
      setSuccessTicket([newTicket]);
      setRecentGuestPurchases(prev => [newTicket, ...prev]);
      
      // Clean up gateway
      setPendingPayment(null);

      // Clean inputs
      setClientName(currentUser?.fullName || '');
      setClientNit(currentUser?.nit || '');
      setQuant(1);
      setSelectedSeats([]);
    }, 2000); // 2 seconds of high fidelity spinner validation
  };

  // Pre-fill fields whenever the logged-in user changes
  React.useEffect(() => {
    if (currentUser) {
      setClientName(currentUser.fullName || '');
      setClientNit(currentUser.nit || '');
    }
  }, [currentUser]);

  // Adjust selected seats when quantity changes
  React.useEffect(() => {
    if (selectedSeats.length > quant) {
      setSelectedSeats(prev => prev.slice(0, quant));
    }
  }, [quant]);

  // Reset seats when selection shifts
  React.useEffect(() => {
    setSelectedSeats([]);
  }, [selectedShow, selectedMovie, targetDate]);
  
  // Checkout & Simulation States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successTicket, setSuccessTicket] = useState<TicketRef[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filter shows for selected targetDate (Today or Tomorrow)
  const availableShows = shows.filter(s => {
    // Shows are either configured as 'base' (means repeats everyday) OR specifically for targetDate
    return (s.date === 'base' || s.date === targetDate);
  });

  const getShowOccupancy = (showId: string) => {
    const sold = tickets.filter(t => t.showId === showId && t.showDate === targetDate).length;
    const show = shows.find(s => s.id === showId);
    const room = rooms.find(r => r.id === show?.roomId);
    const capacity = room ? room.capacity : 100;
    const percent = Math.round((sold / capacity) * 100);
    return { sold, capacity, percent };
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    // Find first show for this movie to helper-select
    const movieShows = availableShows.filter(s => s.movieId === movie.id);
    if (movieShows.length > 0) {
      setSelectedShow(movieShows[0]);
    } else {
      setSelectedShow(null);
    }
    setSuccessTicket(null);
  };

  const handleBuyTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShow || !selectedMovie) return;

    if (selectedMovie.allowSeatSelection && selectedSeats.length !== quant) {
      alert(`⚠️ Por favor, selecciona exactamente ${quant} ${quant === 1 ? 'butaca' : 'butacas'} en el mapa de la sala antes de continuar.`);
      return;
    }

    const { sold, capacity } = getShowOccupancy(selectedShow.id);
    if (sold + quant > capacity) {
      alert(`⚠️ Lo sentimos, solo quedan ${capacity - sold} asientos disponibles para esta función.`);
      return;
    }

    const isPromoActive = getShowOccupancy(selectedShow.id).percent < 30;
    
    // Calculate 2x1 discount
    let totalPaid = 0;
    if (isPromoActive) {
      const pairs = Math.floor(quant / 2);
      const remainder = quant % 2;
      totalPaid = (pairs + remainder) * selectedShow.price;
    } else {
      totalPaid = quant * selectedShow.price;
    }

    // Capture payment intent with all details set to pending
    setPendingPayment({
      show: selectedShow,
      movie: selectedMovie,
      quant: quant,
      clientName: clientName || 'Cliente Virtual',
      clientNit: clientNit || 'C/F',
      selectedSeats: [...selectedSeats],
      pricePaid: totalPaid,
      isPromoActive: isPromoActive,
      date: targetDate
    });

    setPaymentStep('qr_display');
    setPaymentTimer(300); // 5 minutes (300 seconds)
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans pb-12" id="client-view">
      
      {/* Visual Jumbotron Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white py-12 px-6 rounded-b-[2rem] shadow-xl text-center relative overflow-hidden" id="client-jumbo">
        <div className="absolute inset-0 bg-opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
        
        <div className="max-w-4xl mx-auto relative z-10 space-y-3">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold tracking-widest text-xs px-3.5 py-1.5 rounded-full uppercase">
            🍿 Preventa Virtual de Boletos
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Experiencia Cinema Premium</h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto">
            Adquiere tus boletos de forma segura y evita filas. Tus entradas se emitirán con código QR para ingreso exprés.
          </p>

          {/* Date Selector Constraint - "pueden comprar 1 dia antes" */}
          <div className="inline-flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 mt-6 shadow-md" id="purchase-window">
            <button
              onClick={() => { setTargetDate(getTodayDateString()); setSuccessTicket(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                targetDate === getTodayDateString() 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoy ({getTodayDateString()})
            </button>
            <button
              onClick={() => { setTargetDate(getTomorrowDateString()); setSuccessTicket(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                targetDate === getTomorrowDateString() 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mañana ({getTomorrowDateString()})
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            ⚠️ Regulaciones: Compra habilitada para un día de anticipación como máximo en base a cartelera vigente.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8" id="client-body">
        
        {/* LEFT COLUMN: MOVIE GRID (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900">Películas Disponibles en Cartelera</h3>
            <div className="relative text-xs w-48">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar película..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="movies-grid">
            {movies
              .filter(m => m.isActive && m.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(movie => {
                // Check if this movie has any scheduled shows today
                const movieShowsCount = availableShows.filter(s => s.movieId === movie.id).length;

                return (
                  <div 
                    key={movie.id} 
                    onClick={() => handleSelectMovie(movie)}
                    className={`bg-white rounded-xl overflow-hidden border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${
                      selectedMovie?.id === movie.id 
                        ? 'border-indigo-600 ring-2 ring-indigo-600/15' 
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Image / Banner */}
                      <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                        <img 
                          src={movie.posterUrl} 
                          alt={movie.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover select-none"
                        />
                        <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] uppercase font-bold px-2 py-1 rounded">
                          {movie.ageRating}
                        </div>
                        {movieShowsCount === 0 && (
                          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center p-3 text-center">
                            <span className="text-xs bg-red-600 text-white font-bold px-2.5 py-1 rounded">
                              Sin funciones pág. hoy
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-1.5 line-clamp-1">{movie.title}</h4>
                        <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{movie.synopsis}</p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex justify-between items-center text-xs text-slate-500">
                      <span className="font-semibold text-slate-400">{movie.genre.split(', ')[0] || 'Cine'}</span>
                      <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {movie.duration}m
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* RIGHT COLUMN: BOOKING FLOW (5 cols) */}
        <div className="lg:col-span-5" id="booking-sidebar">
          {successTicket ? (
            /* PRINTED TICKET RECEIPT WINDOW */
            <div className="bg-emerald-950/10 border-2 border-emerald-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden" id="ticket-success">
              <div className="absolute top-[-10px] left-[-10px] w-8 h-8 rounded-full bg-slate-50"></div>
              <div className="absolute top-[-10px] right-[-10px] w-8 h-8 rounded-full bg-slate-50"></div>
              <div className="absolute bottom-[-10px] left-[-10px] w-8 h-8 rounded-full bg-slate-50"></div>
              <div className="absolute bottom-[-10px] right-[-10px] w-8 h-8 rounded-full bg-slate-50"></div>

              <div className="text-center pb-4 border-b border-emerald-500/20 mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-extrabold text-lg text-emerald-950">¡Compra Virtual Exitosa!</h4>
                <p className="text-xs text-slate-600 mt-1">Tu boleto digital se encuentra activo.</p>
              </div>

              {successTicket.map(t => (
                <div key={t.id} className="space-y-4 bg-white p-4 rounded-xl border border-dashed border-slate-300">
                  <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Código Boleto</span>
                      <span className="block font-bold text-slate-900 font-mono">{t.id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold text-indigo-700 block bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                        CANAL ONLINE
                      </span>
                      <span className="text-[10px] text-slate-500">{t.timestamp.substring(11, 16)} hrs</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500">Pelicula (Función):</span>
                      <p className="font-bold text-slate-900 text-sm">{t.movieTitle}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Sala</span>
                        <p className="font-semibold text-slate-800">{t.roomName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Hora inicio</span>
                        <p className="font-bold text-slate-900 font-mono text-sm">{t.startTime} Bs.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-slate-700 border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase">NIT Comprador</span>
                        <p className="font-semibold text-slate-800 font-mono">{t.nit}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase">Nombre Factura</span>
                        <p className="font-semibold text-slate-800 truncate">{t.clientName}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 border-dashed pt-3 mt-3">
                      <span className="text-[10px] text-slate-400 uppercase">Detalle de Asignación / Asientos</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {t.seatNumbers.map((s, idx) => (
                          <span key={idx} className="bg-indigo-50 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed italic">
                        * No requieres elegir en grilla virtual. Al ingresar presentas este código QR y puedes ocupar tu asiento asignado consecutivamente o por orden de llegada general en la sala asignada.
                      </p>
                    </div>
                  </div>

                  {/* QR Image Simulation Container */}
                  <div className="flex flex-col items-center justify-center pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-center items-center shadow-inner">
                      <QrCode className="w-24 h-24 text-slate-900 animate-pulse" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">QR Válido General</span>
                    {t.isPromo2x1 && (
                      <span className="mt-2 bg-emerald-50 text-emerald-800 text-xs px-3 py-1 rounded font-bold border border-emerald-200">
                        🎁 Beneficio 2x1 Aplicado
                      </span>
                    )}
                    <span className="mt-2 font-bold text-slate-900 text-sm">Total Pagado: {t.pricePaid} Bs.</span>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setSuccessTicket(null)}
                className="w-full mt-4 bg-slate-950 text-white font-bold py-2.5 rounded-xl hover:bg-slate-900 transition-colors text-xs flex items-center justify-center gap-2"
              >
                Comprar Más Boletos
              </button>
            </div>
          ) : pendingPayment ? (
            /* INTERACTIVE QR DEPOSIT VERIFICATION PORTAL */
            <div className="bg-slate-900 border-2 border-indigo-500/30 p-6 rounded-2xl shadow-xl space-y-6 text-white" id="qr-payment-gateway">
              <div className="text-center pb-4 border-b border-slate-800">
                <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2 font-black border border-indigo-500/20">
                  <QrCode className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-base tracking-tight text-white">Pasarela de Pago QR Simple</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Red de Pago Integrada de la Banca Pública de Bolivia
                </p>
              </div>

              {paymentStep === 'qr_display' ? (
                <div className="space-y-5">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Total a transferir:</span>
                      <span className="font-bold text-indigo-400 text-sm">{pendingPayment.pricePaid} Bs.</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Película:</span>
                      <span className="font-medium text-slate-350 truncate max-w-[200px]">{pendingPayment.movie.title}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">NIT/CI de Factura:</span>
                      <span className="font-mono text-slate-350">{pendingPayment.clientNit}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Facturar a:</span>
                      <span className="font-medium text-slate-300 truncate max-w-[200px]">{pendingPayment.clientName}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4 bg-white rounded-2xl border border-slate-200 shadow-md">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-center">
                      <QrCode className="w-36 h-36 text-slate-900" />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-2 font-mono uppercase bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                      Bolivia-QR-Interbancario
                    </span>
                  </div>

                  <div className="bg-indigo-950/40 border border-indigo-900/50 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-indigo-300">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                        Esperando abono...
                      </span>
                      <div className="font-mono bg-slate-950 px-2 py-0.5 rounded text-indigo-400 font-bold border border-indigo-900/40">
                        ⏳ {formatTimer(paymentTimer)}
                      </div>
                    </div>
                    <p className="text-[10.5px] text-indigo-200/80 leading-normal">
                      Abre la aplicación de tu Banco, escanea este código de pago único de <strong>{pendingPayment.pricePaid} Bs.</strong> y confirma tu envío. Una vez que hayas transferido, haz clic en el botón de abajo para verificar el abono.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleConfirmQRTransfer}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-extrabold py-3 rounded-xl transition-all text-xs cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide shadow-md shadow-indigo-600/10 font-sans"
                    >
                      Confirmar abono bancario (Validar pago)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingPayment(null)}
                      className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Anular y volver atrás
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <QrCode className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-100">Verificando Transferencia Bancaria...</h5>
                    <p className="text-[11px] text-slate-400 max-w-[280px] mx-auto mt-1.5 leading-relaxed">
                      Consultando el depósito correspondiente de {pendingPayment.pricePaid} Bs. con la pasarela interbancaria (ACH/Sintesis Bolivia). Por favor, aguarda un instante.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : selectedMovie ? (
            /* ACTIVE BOOKING CHANNELS FORM */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6" id="booking-form-box">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Seleccionaste</span>
                  <h4 className="font-extrabold text-slate-950 text-sm">{selectedMovie.title}</h4>
                </div>
                <button 
                  onClick={() => setSelectedMovie(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Cambiar película
                </button>
              </div>

              {/* Showtimes Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Horarios de Función Disponibles para {targetDate === getTodayDateString() ? 'Hoy' : 'Mañana'}</label>
                {availableShows.filter(s => s.movieId === selectedMovie.id).length === 0 ? (
                  <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg">
                    ⚠️ No hay funciones especiales programadas para esta fecha. Pero el cine repite automáticamente sus funciones base diarias de 2 a 10 PM. Por favor seleccione otra película con funciones.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2" id="available-showtimes">
                    {availableShows
                      .filter(s => s.movieId === selectedMovie.id)
                      .map((show) => {
                        const room = rooms.find(r => r.id === show.roomId);
                        const { sold, capacity, percent } = getShowOccupancy(show.id);
                        const isPromo = percent < 30; // low attendance condition!
                        
                        return (
                          <button
                            key={show.id}
                            type="button"
                            onClick={() => setSelectedShow(show)}
                            className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between ${
                              selectedShow?.id === show.id
                                ? 'border-indigo-600 bg-indigo-50/50'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                {show.startTime} hrs
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-0.5">{room?.name}</span>
                            </div>
                            
                            <div className="mt-3 pt-2 border-t border-slate-100/60 w-full flex justify-between items-center text-[10px]">
                              <span className="font-bold text-slate-800">{show.price} Bs.</span>
                              {isPromo && (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[9px] animate-pulse">
                                  🏷️ 2x1
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {selectedShow && (
                <form onSubmit={handleBuyTicketSubmit} className="space-y-4">
                  {/* Suggestion to register or login for guest users */}
                  {!currentUser && (
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-50/40 border border-indigo-150 p-3.5 rounded-xl text-xs space-y-2.5 text-indigo-950 shadow-sm" id="guest-suggest-card">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="font-bold block text-indigo-900 text-xs">🍿 Compra como Invitado o Cliente Registrado</span>
                          <p className="text-slate-600 text-[10.5px] leading-normal pt-0.5">
                            Estás comprando en modo <strong>invitado</strong>. Si te registras, tus boletos QR se guardarán en tu historial de cliente y se auto-completará tu NIT y Nombre para ingreso exprés.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => onOpenAuth?.('login')}
                          className="bg-indigo-600/10 hover:bg-slate-200 text-indigo-800 font-bold px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer"
                        >
                          Iniciar Sesión
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAuth?.('register')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded-lg text-[10px] transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
                        >
                          Registrar Cliente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Promo Banner if low occupancy */}
                  {getShowOccupancy(selectedShow.id).percent < 30 ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2 text-xs text-emerald-800" id="low-occupancy-promo">
                      <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <span className="font-bold block text-emerald-900">🔥 ¡Promo 2x1 por Baja Ocupación Activada!</span>
                        La ocupación de este show es menor al 30%. ¡Compra en pares y llévate el doble de entradas por el mismo precio!
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-2.5 rounded-lg text-slate-500 text-[11px] leading-relaxed">
                      💡 Tarifa regular aplicada. Si la asistencia desciende del 30%, el sistema habilitará automáticamente la promoción 2x1 en boletería.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Boletos a Adquirir</label>
                      <input 
                        type="number" 
                        value={quant}
                        onChange={e => setQuant(Math.max(1, Number(e.target.value)))}
                        min={1}
                        max={10}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">NIT / CI del Cliente</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 9942093" 
                        value={clientNit}
                        onChange={e => setClientNit(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre Completo (Para Factura)</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Alejandro Rojas" 
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm"
                      required
                    />
                  </div>

                  {selectedMovie.allowSeatSelection && (
                    <div className="pt-2">
                      <SeatingMap
                        showId={selectedShow.id}
                        showDate={targetDate}
                        capacity={rooms.find(r => r.id === selectedShow.roomId)?.capacity || 100}
                        roomName={rooms.find(r => r.id === selectedShow.roomId)?.name || 'Sala'}
                        tickets={tickets}
                        selectedSeats={selectedSeats}
                        onChangeSelectedSeats={setSelectedSeats}
                        requiredCount={quant}
                      />
                    </div>
                  )}

                  {/* Payment selection constraint - Online requires QR */}
                  <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-indigo-700" />
                      <div>
                        <span className="font-bold text-xs block text-slate-800">Pago Digital QR</span>
                        <span className="text-[10px] text-slate-500">Transacción interbancaria segura boliviana</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded font-mono">
                      ACTIVO
                    </span>
                  </div>

                  {/* Price Summary */}
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs text-slate-600 font-medium">
                    <span>
                      Precio Unitario: {selectedShow.price} Bs. 
                      {getShowOccupancy(selectedShow.id).percent < 30 && <span className="text-emerald-700 font-bold block">✓ Promo 2x1 Aplicada</span>}
                    </span>
                    <span className="text-right text-sm">
                      Total a pagar: 
                      <strong className="text-lg text-slate-900 block font-bold font-mono">
                        {(() => {
                          const isPromo = getShowOccupancy(selectedShow.id).percent < 30;
                          if (isPromo) {
                            const pairs = Math.floor(quant / 2);
                            const remainder = quant % 2;
                            return (pairs + remainder) * selectedShow.price;
                          }
                          return quant * selectedShow.price;
                        })()}{' '}
                        Bs.
                      </strong>
                    </span>
                  </div>

                  {isProcessing ? (
                    <div className="bg-slate-900 text-white p-3.5 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-2.5 cursor-wait">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                      <span>Generando Enlace de Pago & QR...</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-md uppercase tracking-wider"
                    >
                      <QrCode className="w-4 h-4" />
                      Pagar y Obtener Boleto QR
                    </button>
                  )}
                </form>
              )}
            </div>
          ) : (
            /* DEFAULT NOT SELECTED BOX */
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4" id="select-help-box">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <ChevronRight className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900">Selecciona Película y Horario</h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Busca la película de tu preferencia en el panel izquierdo. Elige la función de hoy o mañana para reservar tus asientos virtuales.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MY TICKETS HISTORIC DASHBOARD FOR BOTH REGISTERED AND GUEST CUSTOMERS */}
      <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-slate-200" id="personal-tickets-dashboard">
        {currentUser ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                Mis Boletos Adquiridos
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Historial de entradas compradas desde tu cuenta de cliente virtual <strong>({currentUser.fullName})</strong>.
              </p>
            </div>
            <div className="bg-slate-100 text-slate-700 font-mono text-[11px] px-3 py-1.5 rounded-lg border border-slate-200">
              NIT/CI de Cuenta: <span className="font-bold">{currentUser.nit || 'Sin NIT'}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Ticket className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                Consulta / Canje de Boletos para Invitados
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xl">
                ¿Compraste como invitado? Rastrea tus boletos ingresando el <strong>NIT / CI</strong> con el que realizaste la compra, o visualiza los tickets adquiridos en tu pestaña activa.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <input
                type="text"
                placeholder="Ingresar tu NIT / CI..."
                value={searchGuestNit}
                onChange={e => setSearchGuestNit(e.target.value)}
                className="bg-slate-50 border border-slate-250 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-400 w-full md:w-48 font-mono text-slate-800"
              />
              {searchGuestNit && (
                <button
                  type="button"
                  onClick={() => setSearchGuestNit('')}
                  className="bg-slate-100 hover:bg-slate-200 text-[10px] px-2.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}

        {(() => {
          let myTickets: TicketRef[] = [];
          
          if (currentUser) {
            // Logged-in customer: automatically queries by NIT or name
            myTickets = tickets.filter(t => 
              t.channel === 'Online' && (
                (currentUser.nit && t.nit === currentUser.nit) || 
                t.clientName.toLowerCase() === currentUser.fullName.toLowerCase()
              )
            );
          } else {
            // Guest customer: show tickets bought in current session PLUS tickets matching searchGuestNit if typed!
            myTickets = tickets.filter(t => {
              const isOnline = t.channel === 'Online';
              const isRecentSession = recentGuestPurchases.some(rg => rg.id === t.id);
              const matchesSearchNit = searchGuestNit ? (t.nit && t.nit.trim() === searchGuestNit.trim()) : false;
              return isOnline && (isRecentSession || matchesSearchNit);
            });
          }

          if (myTickets.length === 0) {
            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 max-w-md mx-auto">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">No tienes boletos registrados</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {currentUser 
                    ? `Cualquier boleto que compres con tu NIT (${currentUser.nit || 'C/F'}) se listará aquí.`
                    : searchGuestNit 
                      ? `No encontramos compras recientes asociadas al NIT/CI: "${searchGuestNit}"`
                      : 'Aquí aparecerán los boletos que compres en esta sesión. O ingresa tu NIT/CI arriba para recuperar un boleto.'}
                </p>
              </div>
            );
          }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="my-tickets-grid">
                {myTickets.map(t => (
                  <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="bg-slate-950 text-white p-4">
                      <div className="flex justify-between items-start">
                        <span className="bg-indigo-600 font-mono text-[9px] font-bold px-2 py-0.5 rounded text-white uppercase uppercase">
                          Boleto Web QR
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{t.showDate}</span>
                      </div>
                      <h4 className="font-bold text-sm tracking-tight text-white mt-2 line-clamp-1">{t.movieTitle}</h4>
                    </div>

                    <div className="p-4 space-y-3 text-xs border-b border-slate-100">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Sala</span>
                          <span className="font-semibold text-slate-800">{t.roomName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Horario</span>
                          <span className="font-extrabold text-slate-900 font-mono">{t.startTime} Hrs</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Titular</span>
                          <span className="font-semibold text-slate-800 truncate block">{t.clientName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-mono">NIT/CI Factura</span>
                          <span className="font-bold text-slate-800 font-mono">{t.nit}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-mono mb-1">Asientos asignados</span>
                        <div className="flex flex-wrap gap-1">
                          {t.seatNumbers.map((seat, index) => (
                            <span key={index} className="bg-slate-100 text-slate-800 text-[9px] px-1.5 py-0.5 rounded border border-slate-200">
                              {seat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-white p-1 rounded border border-slate-200">
                          <QrCode className="w-10 h-10 text-slate-900" />
                        </div>
                        <div>
                          <p className="font-mono text-[9px] text-slate-400 font-semibold uppercase">ID Boleto</p>
                          <p className="font-mono text-[10px] text-slate-700 font-bold">{t.id.substring(6, 14)}...</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Pagado</span>
                          <span className="font-mono font-bold text-slate-900 text-xs">{t.pricePaid} Bs.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('¿Deseas devolver o anular este boleto digital? Se liberarán tus butacas asignadas en el sistema.')) {
                              setTickets(prev => prev.filter(item => item.id !== t.id));
                            }
                          }}
                          className="text-[9px] text-red-650 hover:text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded border border-red-100 font-bold cursor-pointer transition-all uppercase"
                          title="Anular boleto y liberar asientos"
                        >
                          Anular
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
