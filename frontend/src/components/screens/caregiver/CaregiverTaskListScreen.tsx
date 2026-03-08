import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Camera,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  User,
  Flag,
} from "lucide-react";
import { useCaregiverSchedule, ScheduleEntry } from "../../../api/schedule";
import { useNavigate } from "@tanstack/react-router";
import { useCaregiverPatients } from "../../../api/caregiver";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-50 border-amber-200 text-amber-700", text: "PENDING" },
  completed: { bg: "bg-emerald-50 border-emerald-300 text-emerald-700", text: "COMPLETED" },
  missed: { bg: "bg-red-50 border-red-200 text-red-600", text: "MISSED" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={10} />,
  completed: <CheckCircle2 size={10} />,
  missed: <AlertCircle size={10} />,
};

export default function CaregiverTaskListScreen() {
  const navigate = useNavigate();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed" | "missed">("all");

  const monthKey = getMonthKey(currentDate);
  const { data: entries = [], isLoading, error } = useCaregiverSchedule(monthKey);
  const { data: patientsData } = useCaregiverPatients();
  const patients = patientsData?.patients || [];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const filtered = useMemo(() => {
    const list = activeTab === "all" ? entries : entries.filter((e) => e.status === activeTab);
    return [...list].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [entries, activeTab]);

  const counts = useMemo(() => ({
    all: entries.length,
    pending: entries.filter((e) => e.status === "pending").length,
    completed: entries.filter((e) => e.status === "completed").length,
    missed: entries.filter((e) => e.status === "missed").length,
  }), [entries]);

  // Find patientId for a given schedule entry to pass to recording
  const getPatientId = (entry: ScheduleEntry): string => {
    const patient = patients.find(
      (p: any) => (p._id || p.id) === entry.patientId || p.fullName === entry.patientName,
    );
    return patient?.id || patient?._id || entry.patientId || "";
  };

  const handleRecordNow = (entry: ScheduleEntry) => {
    navigate({
      to: "/caregiver/record",
      search: {
        scheduleEntryId: entry._id,
        actionType: entry.actionType,
        patientId: getPatientId(entry),
      },
    });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="mb-10 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
              MY ASSIGNED TASKS
            </h3>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter flex items-center gap-3">
              <ListChecks size={36} /> Task Queue
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
              RECORDING TASKS ASSIGNED BY YOUR THERAPIST
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all" aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <span className="font-black uppercase tracking-widest text-sm min-w-[10rem] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all" aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "TOTAL", count: counts.all, color: "text-zinc-900" },
            { label: "PENDING", count: counts.pending, color: "text-amber-600" },
            { label: "COMPLETED", count: counts.completed, color: "text-emerald-700" },
            { label: "MISSED", count: counts.missed, color: "text-red-600" },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-zinc-50 border-2 border-zinc-100 p-4 text-center">
              <div className={`text-4xl font-black ${color}`}>{count}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b-2 border-zinc-100 mb-6">
          {(["all", "pending", "completed", "missed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? "border-b-2 border-zinc-900 text-zinc-900 -mb-[2px] bg-white"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab}
              {counts[tab] > 0 && (
                <span className="ml-2 text-[8px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded font-black">
                  {counts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-zinc-300" size={28} />
          </div>
        ) : error ? (
          <div className="border-2 border-dashed border-red-200 p-16 text-center">
            <AlertCircle size={32} className="mx-auto text-red-300 mb-4" />
            <p className="font-black uppercase tracking-widest text-red-400 text-sm">
              Failed to load tasks
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-200 p-16 text-center">
            <ListChecks size={32} className="mx-auto text-zinc-200 mb-4" />
            <p className="font-black uppercase tracking-widest text-zinc-400 text-sm">
              {activeTab === "all" ? "No tasks assigned" : `No ${activeTab} tasks`}
            </p>
            <p className="text-xs text-zinc-300 mt-2 font-bold uppercase tracking-wide">
              {activeTab === "all" ? "Your therapist will assign recording tasks here" : `Switch to "All" to see all your tasks`}
            </p>
          </div>
        ) : (
          <div className="border-2 border-zinc-100 divide-y divide-zinc-100">
            {filtered.map((entry) => {
              const d = new Date(entry.scheduledDate);
              const isToday = d.toDateString() === today.toDateString();
              const isPast = d < today && !isToday;
              const style = STATUS_STYLES[entry.status] || STATUS_STYLES.pending;

              return (
                <div
                  key={entry._id}
                  className={`p-5 flex items-start gap-6 transition-colors ${
                    entry.status === "pending" ? "hover:bg-zinc-50" : ""
                  } ${isToday && entry.status === "pending" ? "bg-amber-50/30 border-l-4 border-l-amber-400" : ""}`}
                >
                  {/* Date block */}
                  <div className={`flex-shrink-0 w-14 text-center border-2 py-2 ${isToday ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-100"}`}>
                    <div className={`text-[9px] font-black uppercase tracking-widest ${isToday ? "text-zinc-400" : "text-zinc-400"}`}>
                      {d.toLocaleString("default", { month: "short" })}
                    </div>
                    <div className={`text-2xl font-black ${isToday ? "text-white" : "text-zinc-900"}`}>
                      {d.getDate()}
                    </div>
                    {isToday && (
                      <div className="text-[7px] font-black uppercase tracking-widest text-amber-400">TODAY</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-black text-zinc-900 uppercase tracking-tight text-sm">
                        {entry.actionType}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${style.bg}`}>
                        {STATUS_ICON[entry.status]}
                        {style.text}
                      </span>
                      {isPast && entry.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-orange-200 bg-orange-50 text-orange-600">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <User size={9} /> {entry.patientName}
                      </span>
                      {entry.timeSlot && (
                        <span className="flex items-center gap-1">
                          <Clock size={9} /> {entry.timeSlot}
                        </span>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="mt-2 text-[10px] text-zinc-400 font-mono border-l-2 border-zinc-100 pl-2">
                        {entry.notes}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {entry.status === "pending" ? (
                      <button
                        onClick={() => handleRecordNow(entry)}
                        className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all group"
                      >
                        <Camera size={14} className="group-hover:scale-110 transition-transform" />
                        Record Now
                      </button>
                    ) : entry.status === "completed" ? (
                      <div className="flex items-center gap-2 px-4 py-3 border-2 border-emerald-200 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={14} /> Done
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-3 border-2 border-red-100 text-red-400 text-[10px] font-black uppercase tracking-widest">
                        <AlertCircle size={14} /> Missed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
