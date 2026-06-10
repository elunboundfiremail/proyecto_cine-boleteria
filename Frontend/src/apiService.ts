/**
 * API Service for Cinema Management System
 * Ready to be connected to a production server.
 * 
 * To link to a real backend, simply set USE_REAL_BACKEND = true
 * and customize the API_BASE_URL.
 */

import { Movie, Show, TicketRef, DistributorEmail, User } from './types';

// Toggle the backend behavior
export const USE_REAL_BACKEND = false;
export const API_BASE_URL = '/api';

/**
 * Helper to execute fetch requests when using a real backend,
 * or fallback to simulated endpoints.
 */
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  localFallback?: () => T
): Promise<T> {
  if (USE_REAL_BACKEND) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`API Error on ${method} ${endpoint}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  } else {
    // Return simulator response with small latency to feel real-time in production
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(localFallback ? localFallback() : (null as unknown as T));
      }, 150);
    });
  }
}

export const apiService = {
  // --- MOVIES ENDPOINTS (REST API definitions) ---
  /** GET /api/movies */
  getMovies: async (fallbackData: Movie[]): Promise<Movie[]> => {
    return apiRequest<Movie[]>('/movies', 'GET', null, () => {
      const saved = localStorage.getItem('cinema_movies');
      return saved ? JSON.parse(saved) : fallbackData;
    });
  },

  /** POST /api/movies */
  createMovie: async (movie: Movie): Promise<Movie> => {
    return apiRequest<Movie>('/movies', 'POST', movie, () => {
      const saved = localStorage.getItem('cinema_movies');
      const list: Movie[] = saved ? JSON.parse(saved) : [];
      list.push(movie);
      localStorage.setItem('cinema_movies', JSON.stringify(list));
      return movie;
    });
  },

  /** DELETE /api/movies/:id */
  deleteMovie: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/movies/${id}`, 'DELETE', null, () => {
      const savedMovies = localStorage.getItem('cinema_movies');
      if (savedMovies) {
        const list: Movie[] = JSON.parse(savedMovies);
        localStorage.setItem('cinema_movies', JSON.stringify(list.filter(m => m.id !== id)));
      }
      
      // Also cascades deletion to shows for safety
      const savedShows = localStorage.getItem('cinema_shows');
      if (savedShows) {
        const showList: Show[] = JSON.parse(savedShows);
        localStorage.setItem('cinema_shows', JSON.stringify(showList.filter(s => s.movieId !== id)));
      }
      return { success: true };
    });
  },

  // --- SHOWS ENDPOINTS (REST API definitions) ---
  /** GET /api/shows */
  getShows: async (fallbackData: Show[]): Promise<Show[]> => {
    return apiRequest<Show[]>('/shows', 'GET', null, () => {
      const saved = localStorage.getItem('cinema_shows');
      return saved ? JSON.parse(saved) : fallbackData;
    });
  },

  /** POST /api/shows */
  createShow: async (show: Show): Promise<Show> => {
    return apiRequest<Show>('/shows', 'POST', show, () => {
      const saved = localStorage.getItem('cinema_shows');
      const list: Show[] = saved ? JSON.parse(saved) : [];
      list.push(show);
      localStorage.setItem('cinema_shows', JSON.stringify(list));
      return show;
    });
  },

  /** DELETE /api/shows/:id */
  deleteShow: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/shows/${id}`, 'DELETE', null, () => {
      const saved = localStorage.getItem('cinema_shows');
      if (saved) {
        const list: Show[] = JSON.parse(saved);
        localStorage.setItem('cinema_shows', JSON.stringify(list.filter(s => s.id !== id)));
      }
      return { success: true };
    });
  },

  // --- TICKETS ENDPOINTS (REST API definitions) ---
  /** GET /api/tickets */
  getTickets: async (fallbackData: TicketRef[]): Promise<TicketRef[]> => {
    return apiRequest<TicketRef[]>('/tickets', 'GET', null, () => {
      const saved = localStorage.getItem('cinema_tickets');
      return saved ? JSON.parse(saved) : fallbackData;
    });
  },

  /** POST /api/tickets */
  createTicket: async (ticket: TicketRef): Promise<TicketRef> => {
    return apiRequest<TicketRef>('/tickets', 'POST', ticket, () => {
      const saved = localStorage.getItem('cinema_tickets');
      const list: TicketRef[] = saved ? JSON.parse(saved) : [];
      list.push(ticket);
      localStorage.setItem('cinema_tickets', JSON.stringify(list));
      return ticket;
    });
  },

  /** DELETE /api/tickets/:id (Refund/Void Ticket) */
  deleteTicket: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/tickets/${id}`, 'DELETE', null, () => {
      const saved = localStorage.getItem('cinema_tickets');
      if (saved) {
        const list: TicketRef[] = JSON.parse(saved);
        localStorage.setItem('cinema_tickets', JSON.stringify(list.filter(t => t.id !== id)));
      }
      return { success: true };
    });
  },

  // --- DISTRIBUTOR EMAILS ENDPOINTS (REST API definitions) ---
  /** GET /api/emails */
  getEmails: async (fallbackData: DistributorEmail[]): Promise<DistributorEmail[]> => {
    return apiRequest<DistributorEmail[]>('/emails', 'GET', null, () => {
      const saved = localStorage.getItem('cinema_emails');
      return saved ? JSON.parse(saved) : fallbackData;
    });
  },

  /** POST /api/emails */
  createEmail: async (email: DistributorEmail): Promise<DistributorEmail> => {
    return apiRequest<DistributorEmail>('/emails', 'POST', email, () => {
      const saved = localStorage.getItem('cinema_emails');
      const list: DistributorEmail[] = saved ? JSON.parse(saved) : [];
      list.push(email);
      localStorage.setItem('cinema_emails', JSON.stringify(list));
      return email;
    });
  },

  /** PUT /api/emails/:id (Updates status or answer) */
  updateEmail: async (id: string, updatedEmail: DistributorEmail): Promise<DistributorEmail> => {
    return apiRequest<DistributorEmail>(`/emails/${id}`, 'PUT', updatedEmail, () => {
      const saved = localStorage.getItem('cinema_emails');
      if (saved) {
        const list: DistributorEmail[] = JSON.parse(saved);
        const nextList = list.map(item => item.id === id ? updatedEmail : item);
        localStorage.setItem('cinema_emails', JSON.stringify(nextList));
      }
      return updatedEmail;
    });
  }
};
