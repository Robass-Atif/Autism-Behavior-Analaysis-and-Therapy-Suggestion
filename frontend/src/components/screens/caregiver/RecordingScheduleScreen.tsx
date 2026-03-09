import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  X,
  Camera,
} from "lucide-react";
import { useCaregiverSchedule, ScheduleEntry } from "../../../api/schedule";
import { useNavigate } from "@tanstack/react-router";
import { useCaregiverPatients } from "../../../api/caregiver";

// ─── helpers ──────────────────────────────────────────────────────────────────
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── status badge styling ──────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-zinc-900 text-white",
  completed: "bg-emerald-700 text-white",
  missed: "bg-red-700 text-white",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={7} />,
  completed: <CheckCircle2 size={7} />,
  missed: <AlertCircle size={7} />,
};

// ─── Day Detail Panel ──────────────────────────────────────────────────────────
function DayPanel({
  date,
  entries,
  onClose,
  onRecordNow,
}: {
  date: Date;
  entries: ScheduleEntry[];
  onClose: () => void;
  onRecordNow: (entry: ScheduleEntry) => void;
}) {
  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
        {/* header */}
        <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">
              SCHEDULE DETAIL
            </p>
            <h2 className="text-sm font-black text-white uppercase tracking-tight">
              {label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* body */}
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest text-center py-6">
              No sessions scheduled
            </p>
          ) : (
            entries.map((e) => (
              <div
                key={e._id}
                className="border-2 border-zinc-100 p-4 hover:border-zinc-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-black text-zinc-900 uppercase tracking-tight text-sm">
                    {e.actionType}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                      STATUS_STYLES[e.status] || "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {STATUS_ICON[e.status]}
                    {e.status}
                  </span>
                </div>
                {e.timeSlot && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    <Clock size={10} /> {e.timeSlot}
                  </div>
                )}
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  PATIENT: {e.patientName}
                </div>
                {e.notes && (
                  <p className="mt-2 text-xs text-zinc-500 border-t border-zinc-100 pt-2">
                    {e.notes}
                  </p>
                )}
                {e.status === 'pending' && (
                  <button
                    onClick={() => onRecordNow(e)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all"
                  >
                    <Camera size={11} /> Record Now
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RecordingScheduleScreen() {
  const navigate = useNavigate();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthKey = getMonthKey(currentDate);

  const {
    data: entries = [],
    isLoading,
    error,
  } = useCaregiverSchedule(monthKey);

  // Build a map: 'YYYY-MM-DD' → entries[]
  const entryMap = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    entries.forEach((e) => {
      const d = new Date(e.scheduledDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfMonth(year, month);

  const totalCells = Math.ceil((daysInMonth + firstDow) / 7) * 7;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedEntries = selectedDay
    ? (() => {
        const key = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`;
        return entryMap[key] || [];
      })()
    : [];

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-10 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
              TEMPORAL PLANNING
            </h3>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
              Care Schedule
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
              YOUR UPCOMING RECORDING SESSIONS
            </p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={prevMonth}
              className="p-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-black uppercase tracking-widest text-sm min-w-[10rem] text-center">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* Calendar */}
        <div className="bg-white border-2 border-zinc-200 relative overflow-hidden">
          {/* Corner accent */}
          <div className="absolute top-0 right-0 p-1">
            <div className="w-1.5 h-1.5 bg-zinc-900" />
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b-2 border-zinc-200">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="p-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-r border-zinc-100 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-zinc-400" size={28} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest">
                Failed to load schedule
              </p>
            </div>
          )}

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - firstDow + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const cellDate = new Date(year, month, dayNum);
              const isTodayCell = isCurrentMonth && sameDay(cellDate, today);

              const dayKey = isCurrentMonth
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                : "";
              const dayEntries = isCurrentMonth ? entryMap[dayKey] || [] : [];

              return (
                <div
                  key={i}
                  onClick={() => isCurrentMonth && setSelectedDay(cellDate)}
                  className={[
                    "min-h-[120px] border-r border-b border-zinc-100 p-3 transition-all relative group",
                    !isCurrentMonth
                      ? "bg-zinc-50/50 opacity-30 cursor-default"
                      : "bg-white cursor-pointer hover:bg-zinc-50",
                    isTodayCell
                      ? "ring-2 ring-inset ring-zinc-900 bg-zinc-50 z-10"
                      : "",
                  ].join(" ")}
                >
                  {/* Day number */}
                  {isCurrentMonth && (
                    <span
                      className={`text-xs font-black leading-none ${
                        isTodayCell
                          ? "text-zinc-900 underline underline-offset-4"
                          : "text-zinc-300 group-hover:text-zinc-900 transition-colors"
                      }`}
                    >
                      {String(dayNum).padStart(2, "0")}
                    </span>
                  )}

                  {/* Entries */}
                  {dayEntries.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {dayEntries.slice(0, 2).map((e) => (
                        <div
                          key={e._id}
                          className={`px-1.5 py-1 text-[8px] font-black uppercase tracking-wide ${
                            STATUS_STYLES[e.status] || "bg-zinc-900 text-white"
                          } flex items-center gap-1 overflow-hidden`}
                        >
                          {e.timeSlot && (
                            <span className="flex items-center gap-0.5 opacity-80">
                              <Clock size={7} />
                              {e.timeSlot}
                            </span>
                          )}
                          <span className="truncate">{e.actionType}</span>
                        </div>
                      ))}
                      {dayEntries.length > 2 && (
                        <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest px-0.5">
                          +{dayEntries.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-10 flex flex-col md:flex-row gap-6 justify-between items-start">
          <div className="flex flex-wrap gap-6">
            {[
              { label: "PENDING", color: "bg-zinc-900" },
              { label: "COMPLETED", color: "bg-emerald-700" },
              { label: "MISSED", color: "bg-red-700" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-3 h-3 ${color}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
            CLICK ANY DAY TO VIEW DETAILS
          </div>
        </div>

        {/* Monthly summary */}
        {!isLoading && entries.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-4 border-t-2 border-zinc-100 pt-8">
            {[
              { label: "TOTAL", count: entries.length, color: "text-zinc-900" },
              {
                label: "COMPLETED",
                count: entries.filter((e) => e.status === "completed").length,
                color: "text-emerald-700",
              },
              {
                label: "PENDING",
                count: entries.filter((e) => e.status === "pending").length,
                color: "text-amber-600",
              },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                className="bg-zinc-50 border-2 border-zinc-100 p-4 text-center"
              >
                <div className={`text-3xl font-black ${color}`}>{count}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && entries.length === 0 && (
          <div className="mt-12 border-2 border-dashed border-zinc-200 p-12 text-center">
            <CalendarIcon size={32} className="mx-auto text-zinc-200 mb-4" />
            <p className="font-black uppercase tracking-widest text-zinc-400 text-sm">
              No sessions scheduled
            </p>
            <p className="text-xs text-zinc-300 mt-2 font-bold uppercase tracking-wide">
              Your therapist will assign recording tasks here
            </p>
          </div>
        )}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <DayPanel
          date={selectedDay}
          entries={selectedEntries}
          onClose={() => setSelectedDay(null)}
          onRecordNow={(entry) => {
            navigate({
              to: "/caregiver/record",
              search: {
                scheduleEntryId: entry._id,
                actionType: entry.actionType,
                patientId: entry.patientId || "", // Could use getPatientId here if we imported patients
              },
            });
          }}
        />
      )}
    </div>
  );
}
