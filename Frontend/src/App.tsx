/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Ticket, 
  Settings, 
  Smartphone, 
  CircleDot, 
  Calendar, 
  Info,
  Layers,
  Sparkles,
  HelpCircle,
  LogIn,
  UserCheck,
  UserPlus,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { Movie, Room, Show, TicketRef, DistributorEmail, User, UserRole } from './types';
import { 
  INITIAL_ROOMS, 
  INITIAL_MOVIES, 
  INITIAL_SHOWTIMES, 
  INITIAL_TICKETS, 
  INITIAL_EMAILS, 
  getTodayDateString 
} from './data';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import BoleteriaFisica from './components/BoleteriaFisica';
import { USE_REAL_BACKEND, API_BASE_URL } from './apiService';

// Default accounts for Administrator and Cashier Roles
const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin',
    role: 'admin',
    fullName: 'Vanessa Rojas (Administradora)',
    email: 'admin@cinebolivia.com.bo'
  },
  {
    id: 'usr-cashier',
    username: 'cajero',
    password: 'cajero',
    role: 'cashier',
    fullName: 'Roberto Choque (Cajero Central)',
  }
];

export default function App() {
  // --- USER AUTHENTICATION STATE ---
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('cinema_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('cinema_logged_in_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active form Tab for the unauthenticated portal: 'login' or 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Login form field states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Client registration form field states
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regNit, setRegNit] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Control visibility of the popup login/registration sheet
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Control visibility of the notification banner
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cinema_banner_visible');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const handleCloseBanner = () => {
    setIsBannerVisible(false);
    try {
      localStorage.setItem('cinema_banner_visible', 'false');
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  };
  
  // --- STATE PERSISTENCE IN LOCAL STORAGE ---
  const [movies, setMovies] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem('cinema_movies');
      return saved ? JSON.parse(saved) : INITIAL_MOVIES;
    } catch {
      return INITIAL_MOVIES;
    }
  });

  const [shows, setShows] = useState<Show[]>(() => {
    try {
      const saved = localStorage.getItem('cinema_shows');
      return saved ? JSON.parse(saved) : INITIAL_SHOWTIMES;
    } catch {
      return INITIAL_SHOWTIMES;
    }
  });

  const [tickets, setTickets] = useState<TicketRef[]>(() => {
    try {
      const saved = localStorage.getItem('cinema_tickets');
      return saved ? JSON.parse(saved) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  const [emails, setEmails] = useState<DistributorEmail[]>(() => {
    try {
      const saved = localStorage.getItem('cinema_emails');
      return saved ? JSON.parse(saved) : INITIAL_EMAILS;
    } catch {
      return INITIAL_EMAILS;
    }
  });

  const [selectedDate] = useState<string>(getTodayDateString());

  // Save states to local storage
  useEffect(() => {
    try {
      localStorage.setItem('cinema_users', JSON.stringify(users));
    } catch (e) {
      console.warn("localStorage not available in iframe:", e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('cinema_logged_in_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('cinema_logged_in_user');
      }
    } catch (e) {
      console.warn("localStorage not available in iframe:", e);
    }
  }, [currentUser]);

  // Save states to local storage
  useEffect(() => {
    try {
      localStorage.setItem('cinema_movies', JSON.stringify(movies));
    } catch (e) {
      console.warn("localStorage not available in iframe:", e);
    }
  }, [movies]);

  useEffect(() => {
    try {
      localStorage.setItem('cinema_shows', JSON.stringify(shows));
    } catch (e) {
      console.warn("localStorage not available in iframe:", e);
    }
  }, [shows]);

  useEffect(() => {
    try {
      localStorage.setItem('cinema_tickets', JSON.stringify(tickets));
    } catch (e) {
      console.warn("localStorage not available in iframe:", e);
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem('cinema_emails', JSON.stringify(emails));
    } catch (e) {
      console.warn("localStorage not available in iframe:", e);
    }
  }, [emails]);

  // Synchronize state across multiple open tabs/windows in real time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (!e.newValue) return;
        if (e.key === 'cinema_tickets') {
          setTickets(JSON.parse(e.newValue));
        } else if (e.key === 'cinema_shows') {
          setShows(JSON.parse(e.newValue));
        } else if (e.key === 'cinema_movies') {
          setMovies(JSON.parse(e.newValue));
        } else if (e.key === 'cinema_emails') {
          setEmails(JSON.parse(e.newValue));
        } else if (e.key === 'cinema_users') {
          const loadedUsers = JSON.parse(e.newValue);
          setUsers(loadedUsers);
          // Sync current logged in user if changed
          const savedLoggedIn = localStorage.getItem('cinema_logged_in_user');
          if (savedLoggedIn) {
            const parsed = JSON.parse(savedLoggedIn);
            const fresh = loadedUsers.find((u: any) => u.id === parsed.id);
            if (fresh) setCurrentUser(fresh);
          }
        } else if (e.key === 'cinema_logged_in_user') {
          setCurrentUser(JSON.parse(e.newValue));
        }
      } catch (err) {
        console.warn("Storage sync error:", err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Quick reset helper to clear any simulated over-bookings and start fresh
  const handleSystemRestore = () => {
    if (confirm("¿Deseas restablecer toda la base de datos a los valores iniciales de fábrica? Esto limpiará ventas de prueba.")) {
      setMovies(INITIAL_MOVIES);
      setShows(INITIAL_SHOWTIMES);
      setTickets(INITIAL_TICKETS);
      setEmails(INITIAL_EMAILS);
    }
  };

  // --- LOGIN AND REGISTRATION HANDLERS ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const foundUser = users.find(u => 
      u.username.trim().toLowerCase() === loginUsername.trim().toLowerCase() && 
      u.password === loginPassword
    );

    if (foundUser) {
      setCurrentUser(foundUser);
      setLoginUsername('');
      setLoginPassword('');
      setIsLoginModalOpen(false); // Auto close login popup
    } else {
      setLoginError('⚠️ Usuario o contraseña incorrectos. Por favor intente de nuevo.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regFullName.trim() || !regUsername.trim() || !regPassword.trim()) {
      setRegError('⚠️ Por favor completa todos los campos requeridos (*).');
      return;
    }

    // Check if username taken
    const usernameTaken = users.some(u => u.username.trim().toLowerCase() === regUsername.trim().toLowerCase());
    if (usernameTaken) {
      setRegError('⚠️ El nombre de usuario o correo ya está registrado.');
      return;
    }

    const newClient: User = {
      id: `usr-cl-${Date.now()}`,
      username: regUsername.trim(),
      password: regPassword,
      role: 'client',
      fullName: regFullName.trim(),
      nit: regNit.trim() || 'C/F',
      email: regUsername.includes('@') ? regUsername : `${regUsername}@compras.bo`
    };

    setUsers(prev => [...prev, newClient]);
    setRegSuccess('🎉 ¡Registro exitoso! Iniciando sesión...');
    
    setTimeout(() => {
      setCurrentUser(newClient);
      setRegFullName('');
      setRegUsername('');
      setRegNit('');
      setRegPassword('');
      setRegSuccess('');
      setIsLoginModalOpen(false); // Auto close login popup
    }, 1500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // --- RENDERING CONFIGURATION ---
  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans transition-all selection:bg-indigo-200">
      
      {/* 1. STICKY GLOBAL NAVIGATION BAR */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shrink-0 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-600/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-[15px] tracking-tight text-white flex items-center gap-2">
                Plataforma de Cine y Boletería
                <span className="bg-indigo-500/25 text-indigo-200 font-bold text-[9px] px-2 py-0.5 rounded border border-indigo-500/30 uppercase">
                  v1.5
                </span>
                {!isBannerVisible && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBannerVisible(true);
                      try {
                        localStorage.setItem('cinema_banner_visible', 'true');
                      } catch (e) {}
                    }}
                    className="font-sans font-bold bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/30 hover:border-indigo-400/40 transition-all cursor-pointer flex items-center gap-0.5"
                    title="Activar barra de guía de ayuda de producción superior"
                  >
                    💡 Ayuda
                  </button>
                )}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Boletería Física & Canal Web • Regulación Tributaria Bs.</p>
            </div>
          </div>

          {/* Static/Dynamic View Identity Mode display */}
          <div className="hidden md:flex bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 items-center gap-2" id="identity-header-badge">
            <div className={`w-2.5 h-2.5 rounded-full ${
              currentUser === null ? 'bg-indigo-500 animate-pulse' : currentUser.role === 'admin' ? 'bg-amber-400' : currentUser.role === 'cashier' ? 'bg-emerald-400' : 'bg-indigo-400'
            }`} />
            <span className="text-xs font-bold text-slate-300">
              Visualizando:{' '}
              <span className="text-white uppercase font-extrabold text-[12px] tracking-wide">
                {currentUser === null && 'Cartelera Pública'}
                {currentUser !== null && currentUser.role === 'admin' && 'Gerente Administrador'}
                {currentUser !== null && currentUser.role === 'cashier' && 'Cajero Boletero'}
                {currentUser !== null && currentUser.role === 'client' && `Cliente (${currentUser.fullName})`}
              </span>
            </span>
          </div>

          {/* Profile Bar and LogIn/LogOut Triggers */}
          <div className="flex items-center gap-3">
            {currentUser === null ? (
              <button
                type="button"
                onClick={() => { setIsLoginModalOpen(true); setAuthTab('login'); setLoginError(''); }}
                className="bg-indigo-600 hover:bg-indigo-550 active:scale-95 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                id="header-login-btn"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
            ) : (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white leading-tight">{currentUser.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role === 'client' && `NIT: ${currentUser.nit || 'C/F'}`}
                    {currentUser.role === 'cashier' && 'Módulo de Caja Cine'}
                    {currentUser.role === 'admin' && 'Módulo Administrativo'}
                  </p>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar Sesión Activa"
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all border border-red-500/20 font-bold cursor-pointer"
                  id="header-logout-btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* 2. DYNAMICAL PERSPECTIVE GUIDE CAPTION */}
      {isBannerVisible && (
        <div className="bg-indigo-50 border-b border-indigo-100 py-2 px-4 pr-10 text-xs text-indigo-950 select-none relative">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-1.5">
            <p className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 shrink-0 text-indigo-500 animate-pulse" />
              <span>
                {currentUser === null && "💡 Viendo la cartelera virtual de películas en vivo. Haz clic en 'Iniciar Sesión' para acceder como Cajero o Administrador."}
                {currentUser !== null && currentUser.role === 'client' && `💡 Bienvenido, ${currentUser.fullName}. Tus compras web están configuradas con tu NIT y puedes revisar tu historial al final de la página.`}
                {currentUser !== null && currentUser.role === 'cashier' && "💡 Módulo de Boletería Física para el Cajero de Cine de Ventas Rápidas."}
                {currentUser !== null && currentUser.role === 'admin' && "💡 Panel Administrativo del Gerente General de Programación, Métricas, y Correspondencias."}
              </span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-indigo-100 text-indigo-850 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                {currentUser === null ? 'Invitado General' : `${currentUser.role}`}
              </span>
              {currentUser !== null && currentUser.role !== 'client' && (
                <button
                  type="button"
                  onClick={handleSystemRestore}
                  className="text-[10px] text-red-650 hover:text-red-800 hover:underline font-bold"
                >
                  Restablecer Base de Datos 🔄
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseBanner}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-800 p-1 rounded-full hover:bg-indigo-200/50 transition-all cursor-pointer"
            title="Ocultar esta guía informativa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. MAIN DYNAMIC SUITE SELECTOR (RECONSTRUCTED) */}
      <main className="flex-1 w-full" id="main-content">
        {(currentUser === null || currentUser.role === 'client') ? (
          <ClientPanel
            movies={movies}
            rooms={INITIAL_ROOMS}
            shows={shows}
            tickets={tickets}
            setTickets={setTickets}
            selectedDate={selectedDate}
            currentUser={currentUser}
            onOpenAuth={(tab) => {
              setAuthTab(tab);
              setLoginError('');
              setRegError('');
              setRegSuccess('');
              setIsLoginModalOpen(true);
            }}
          />
        ) : currentUser.role === 'cashier' ? (
          <BoleteriaFisica
            movies={movies}
            rooms={INITIAL_ROOMS}
            shows={shows}
            tickets={tickets}
            setTickets={setTickets}
            selectedDate={selectedDate}
          />
        ) : (
          <AdminPanel
            movies={movies}
            setMovies={setMovies}
            rooms={INITIAL_ROOMS}
            shows={shows}
            setShows={setShows}
            tickets={tickets}
            setTickets={setTickets}
            emails={emails}
            setEmails={setEmails}
            selectedDate={selectedDate}
          />
        )}
      </main>

      {/* SYSTEM FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 shrink-0 font-sans text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-medium text-slate-400">
            © 2026 Sistema Integrado de Salas y Boletería • Todo el Físico sin Elección de Asientos Gráfica Manual • Plataforma de Cine.
          </p>
          <div className="flex gap-4 items-center flex-wrap justify-center sm:justify-start text-[11px] text-slate-400">
            <span>Salas de Cine: Grande A/B, Mediana, Pequeña</span>
            <span>Promoción: 2x1 Automática en baja demanda</span>
            <span className={`px-2 py-0.5 rounded font-sans font-semibold border ${
              USE_REAL_BACKEND 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-150'
            }`}>
              {USE_REAL_BACKEND ? `Servidor en línea activo` : 'Conexión Local Segura'}
            </span>
          </div>
        </div>
      </footer>

      {/* 4. MODAL POPUP FOR AUTHENTICATION */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with blur effect */}
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-all"
            onClick={() => setIsLoginModalOpen(false)}
          />
          
          {/* Modal Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-w-md w-full z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-white" id="login-modal-sheet">
            
            {/* Close button */}
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-all"
              type="button"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Branding within Modal */}
            <div className="text-center space-y-1">
              <div className="bg-indigo-600 p-2 rounded-2xl w-10 h-10 mx-auto text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center">
                <Film className="w-5 h-5" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight text-white pt-1">
                Ingresar al Sistema de Cine
              </h2>
              <p className="text-[10px] text-slate-400">
                Inicia sesión para canjear, facturar o administrar la cartelera
              </p>
            </div>

            {/* Custom tabs selector */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-4 font-semibold" id="modal-auth-tabs">
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setLoginError(''); setRegError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-with ${
                  authTab === 'login' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Iniciar Sesión
              </button>
              
              <button
                type="button"
                onClick={() => { setAuthTab('register'); setLoginError(''); setRegError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-with ${
                  authTab === 'register' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Registrar Cliente
              </button>
            </div>

            {/* TAB 1: LOGIN FORM */}
            {authTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">
                    Usuario o Correo de Acceso
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-colors font-sans"
                    placeholder="Ej: admin o cajero"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl pl-3 pr-9 py-2 text-white text-xs focus:outline-none transition-colors font-sans"
                      placeholder="Finge o digita la contraseña"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="bg-red-955/35 border border-red-500/25 text-red-300 text-[11px] p-2.5 rounded-xl flex items-start gap-1.5 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-indigo-650/15 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Conectarme
                </button>
              </form>
            )}

            {/* TAB 2: CLIENT REGISTRATION */}
            {authTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">
                    Tu Nombre Completo *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-colors"
                    placeholder="Ej: Alejandro Rojas Siles"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">
                      Usuario Deseado *
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-colors"
                      placeholder="Ej: ale123"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">
                      NIT / CI para Facturas
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-colors font-mono"
                      placeholder="Ej: 993201"
                      value={regNit}
                      onChange={e => setRegNit(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">
                    Elige Contraseña *
                  </label>
                  <input
                    type="password"
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-colors"
                    placeholder="Crea tu clave secreta"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                {regError && (
                  <div className="bg-red-955/35 border border-red-500/25 text-red-300 text-[11px] p-2.5 rounded-xl flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="bg-emerald-955/35 border border-emerald-500/25 text-emerald-300 text-[11px] p-2.5 rounded-xl flex items-start gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Completar Registro
                </button>
              </form>
            )}

            {/* Registration is active and clean for production */}

          </div>
        </div>
      )}

    </div>
  );
}
