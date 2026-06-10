/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TicketRef } from '../types';
import { Check, Armchair } from 'lucide-react';

interface SeatingMapProps {
  showId: string;
  showDate: string;
  capacity: number;
  roomName: string;
  tickets: TicketRef[];
  selectedSeats: string[];
  onChangeSelectedSeats: (seats: string[]) => void;
  requiredCount: number;
}

export function SeatingMap({
  showId,
  showDate,
  capacity,
  roomName,
  tickets,
  selectedSeats,
  onChangeSelectedSeats,
  requiredCount
}: SeatingMapProps) {
  
  // Determine rows and columns based on room capacity
  // Sala Grande: 150 (10 rows x 15 columns)
  // Sala Mediana: 100 (10 rows x 10 columns)
  // Sala Pequeña: 60 (6 rows x 10 columns)
  let rowsCount = 10;
  let colsCount = 10;
  
  if (capacity >= 150) {
    rowsCount = 10;
    colsCount = 15;
  } else if (capacity >= 100) {
    rowsCount = 10;
    colsCount = 10;
  } else {
    rowsCount = 6;
    colsCount = 10;
  }

  // Find all occupied seats for this particular show on this target date
  const occupiedSeats = React.useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(ticket => {
      if (ticket.showId === showId && ticket.showDate === showDate) {
        ticket.seatNumbers.forEach(seat => {
          // Normalize seat names for comparison, e.g. "Fila A-Asiento 5" or "Asiento A-5"
          set.add(seat);
        });
      }
    });
    return set;
  }, [tickets, showId, showDate]);

  const handleSeatClick = (seatLabel: string, isOccupied: boolean) => {
    if (isOccupied) return;

    if (selectedSeats.includes(seatLabel)) {
      // Remove it
      onChangeSelectedSeats(selectedSeats.filter(s => s !== seatLabel));
    } else {
      // Add it. If it exceeds required count, we can either:
      // - auto-dequeue the first one selected (to keep selection equal to requiredCount)
      // - or do nothing if they are setting the count based on clicks.
      // Let's implement auto-dequeuing to match requiredCount!
      if (selectedSeats.length >= requiredCount) {
        if (requiredCount === 1) {
          onChangeSelectedSeats([seatLabel]);
        } else {
          // Remove the oldest, add new
          onChangeSelectedSeats([...selectedSeats.slice(1), seatLabel]);
        }
      } else {
        onChangeSelectedSeats([...selectedSeats, seatLabel]);
      }
    }
  };

  const rows = Array.from({ length: rowsCount }, (_, i) => String.fromCharCode(65 + i)); // A, B, C...

  return (
    <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-slate-100 font-sans space-y-4" id="visual-seating-container">
      <div className="text-center space-y-1">
        <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">
          Distribución de Sala: {roomName}
        </span>
        <h4 className="text-sm font-bold text-white">Visualización & Selección de Butacas</h4>
        <p className="text-[10px] text-slate-400">
          Por favor selecciona exactamente <span className="font-bold text-amber-400 font-mono text-xs">{requiredCount}</span> {requiredCount === 1 ? 'butaca' : 'butacas'} (Seleccionadas: {selectedSeats.length}/{requiredCount})
        </p>
      </div>

      {/* Curved Screen Aspect */}
      <div className="relative w-full py-1 mb-4 flex flex-col items-center">
        <div className="w-4/5 h-[6px] bg-sky-400/60 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.5)] mx-auto"></div>
        <span className="text-[9px] text-sky-300/80 uppercase font-bold tracking-widest mt-1 text-center select-none block">
          🎬 PANTALLA / ESCENARIO 🎬
        </span>
      </div>

      {/* Grid of seats */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="flex flex-col gap-1.5 min-w-[500px] justify-center items-center py-2" id="grid-seats-box">
          {rows.map((rowLabel) => {
            return (
              <div key={rowLabel} className="flex items-center gap-1">
                {/* Left Row Label */}
                <span className="w-5 text-center text-[10px] font-bold text-slate-500 font-mono py-1 select-none">
                  {rowLabel}
                </span>

                {/* Seats list */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: colsCount }, (_, colIdx) => {
                    const colNum = colIdx + 1;
                    const seatLabel = `Fila ${rowLabel}-Asiento ${colNum}`;
                    const isOccupied = occupiedSeats.has(seatLabel);
                    const isSelected = selectedSeats.includes(seatLabel);
                    
                    // Create an empty space/aisle in the middle for a realistic layout
                    const showAisle = colsCount === 15 
                      ? (colNum === 6 || colNum === 11) 
                      : (colNum === 6);

                    return (
                      <React.Fragment key={colNum}>
                        {showAisle && <div className="w-4" aria-hidden="true" />}
                        
                        <button
                          type="button"
                          onClick={() => handleSeatClick(seatLabel, isOccupied)}
                          className={`
                            w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-mono transition-all relative group cursor-pointer
                            ${isOccupied 
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-40 line-through' 
                              : isSelected
                                ? 'bg-indigo-600 text-white border border-indigo-400 shadow-[0_0_8px_rgba(79,70,229,0.6)] font-bold scale-105'
                                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 hover:text-white'
                            }
                          `}
                          disabled={isOccupied}
                          title={`${seatLabel} ${isOccupied ? '(Ocupado)' : isSelected ? '(Seleccionado)' : '(Disponible)'}`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <span>{colNum}</span>
                          )}

                          {/* Hover Tooltip */}
                          <span className="absolute bottom-full mb-1.5 hidden group-hover:block bg-slate-950 text-white text-[9px] font-bold py-1 px-1.5 rounded border border-slate-800 z-50 whitespace-nowrap pointer-events-none shadow-md">
                            {rowLabel}-{colNum} {isOccupied ? '❌ Ocupado' : isSelected ? '💜 Seleccionado' : '✅ Disponible'}
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Right Row Label */}
                <span className="w-5 text-center text-[10px] font-bold text-slate-500 font-mono py-1 select-none">
                  {rowLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend below the map */}
      <div className="flex justify-center gap-6 text-[10px] text-slate-400 pt-2 border-t border-slate-900 select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-slate-900 border border-slate-800 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-indigo-600 border border-indigo-400 rounded flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-indigo-300 font-medium">Seleccionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-slate-800 border border-slate-700 opacity-40 rounded"></div>
          <span className="line-through">Ocupado / Reservado</span>
        </div>
      </div>
    </div>
  );
}
