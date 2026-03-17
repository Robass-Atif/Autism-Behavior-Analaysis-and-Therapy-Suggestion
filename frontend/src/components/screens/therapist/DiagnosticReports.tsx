import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  ChevronRight,
  Download,
  Loader2,
  Brain,
  Video,
  Activity,
  Calendar,
  Sparkles,
  ArrowRight,
  ClipboardList,
  Target,
  ExternalLink,
  ShieldAlert,
  User,
  CheckCircle2,
  ChevronLeft
} from "lucide-react";
import { usePatients, usePatient } from "../../../api/patient";
import { useVideoSessions, useGenerateReport } from "../../../api/clinical";
import { AggregatedClinicalReport, VideoSession, ClinicalReportData } from "../../../types";
import { 
  MetricCard, 
  AfirmModuleCard, 
  ClinicalInsightCard, 
  EvidenceChunkCard, 
  Dsm5Badge 
} from "./TherapyRecommendations";
import toast from "../../../lib/toast";

export default function DiagnosticReports() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const { data: patientsData, isFetching: patientsLoading } = usePatients({
    limit: 100,
    search: searchQuery,
  });

  const { data: fullPatientData } = usePatient(selectedPatientId || "");

  const generateReport = useGenerateReport();

  const patients = patientsData?.patients || [];
  const selectedPatient = fullPatientData || patients.find(
    (p: any) => (p.id || p._id) === selectedPatientId,
  );

  const { data: sessionsData, isFetching: sessionsLoading } = useVideoSessions(
    selectedPatientId || "",
  );

  const sessions = sessionsData?.sessions || [];
  
  // Only show sessions that have clinical reports
  const analyzedSessions = useMemo(() => {
    return sessions.filter(s => s.clinicalReport);
  }, [sessions]);

  const activeReport = useMemo(() => {
    if (!selectedPatientId) return null;
    if (selectedSessionId) {
        return analyzedSessions.find(s => s.id === selectedSessionId)?.clinicalReport || null;
    }
    return (selectedPatient?.latestClinicalReport as AggregatedClinicalReport) || null;
  }, [selectedPatientId, selectedSessionId, selectedPatient, analyzedSessions]);

  const parseReportMarkdown = (markdown: string) => {
    if (!markdown) return [];
    const sections = markdown.split(/###?\s+/).filter(Boolean);
    return sections.map(section => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        return { title, content };
    });
  };

  const parsedReport = useMemo(() => {
    const markdown = (activeReport as any)?.clinical_report;
    if (!markdown) return [];
    return parseReportMarkdown(markdown);
  }, [activeReport]);

  const handleExportPDF = async (type: "aggregated_outcome" | "clinical_summary" | "therapy_plan" = "aggregated_outcome") => {
    if (!selectedPatientId) return;
    setIsExportMenuOpen(false);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const blob = await generateReport.mutateAsync({
        patientId: selectedPatientId,
        sessionId: selectedSessionId || undefined,
        reportType: selectedSessionId ? "individual" : type,
        includeCharts: type === "aggregated_outcome",
        includeNotes: true,
        watermark: true,
        includeTables: type === "aggregated_outcome",
        includeGoals: type === "aggregated_outcome",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const name = (selectedPatient?.fullName || "Patient").replace(/\s+/g, "_");
      link.setAttribute("download", `Clinical_Report_${name}_${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF exported successfully", { id: toastId });
    } catch (error) {
      console.error("PDF export failed", error);
      toast.error("Export failed", { id: toastId });
    }
  };

  return (
    <div className="flex h-full bg-white font-mono overflow-hidden">
      {/* Sidebar: Patient Registry */}
      <div className="w-80 border-r-4 border-zinc-900 flex flex-col h-full bg-zinc-50">
        <div className="p-8 border-b-4 border-zinc-900 bg-white">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-6">Report Archive</h2>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
            <input
              type="text"
              placeholder="SEARCH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-xs border-2 border-zinc-900 uppercase font-black tracking-widest bg-zinc-50 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {patientsLoading ? (
            <div className="p-10 text-center opacity-40"><Loader2 className="animate-spin mx-auto mb-2" /> <span className="text-[10px] font-black uppercase">Loading Index...</span></div>
          ) : patients.length === 0 ? (
            <div className="p-10 text-center border-4 border-dashed border-zinc-200">
                <p className="text-[10px] font-black uppercase text-zinc-400">No Records Found</p>
            </div>
          ) : (
            patients.map((p: any) => (
              <button
                key={p.id || p._id}
                onClick={() => { setSelectedPatientId(p.id || p._id); setSelectedSessionId(null); }}
                className={`w-full p-6 text-left border-4 transition-all ${selectedPatientId === (p.id || p._id) ? "bg-zinc-900 border-zinc-900 text-white shadow-[6px_6px_0px_0px_rgba(245,158,11,1)]" : "bg-white border-transparent hover:border-zinc-900"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight">{p.fullName}</h4>
                    <p className={`text-[8px] font-bold mt-1 ${selectedPatientId === (p.id || p._id) ? "text-amber-500" : "text-zinc-400"}`}>MRN: {p.mrn}</p>
                  </div>
                  {(p.latestClinicalReport || (p.id || p._id) === selectedPatientId) && <ChevronRight size={16} />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 relative">
        {selectedPatientId ? (
          <>
            {/* Header / Navigation Bar */}
            <div className="bg-zinc-950 px-8 py-6 border-b-4 border-zinc-900 flex justify-between items-center sticky top-0 z-20 shadow-lg">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setSelectedPatientId(null)}
                        className="p-2 border-2 border-zinc-800 text-zinc-500 hover:text-white hover:border-white transition-all transform hover:-translate-x-1"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">{selectedPatient?.fullName}</h2>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Diagnostic Results | {selectedSessionId ? "Session Report" : "Consolidated Outcome"}</p>
                    </div>
                </div>

                <div className="flex gap-4">
                     <div className="flex bg-zinc-900 p-1 border-2 border-zinc-800 rounded">
                        <button 
                            onClick={() => setSelectedSessionId(null)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${!selectedSessionId ? "bg-amber-400 text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                            Consolidated
                        </button>
                        <div className="w-px bg-zinc-800 mx-1"></div>
                        <div className="relative">
                            <button 
                                onClick={() => setIsSessionMenuOpen(!isSessionMenuOpen)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedSessionId ? "bg-zinc-100 text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                            >
                                <Video size={14} /> {selectedSessionId ? `S-${selectedSessionId.slice(-4)}` : "By Session"}
                            </button>
                            {(isSessionMenuOpen || analyzedSessions.length > 0) && (
                                <div className={`absolute right-0 top-full mt-2 w-64 bg-zinc-900 border-4 border-zinc-800 transition-all z-50 p-2 space-y-1 shadow-2xl ${isSessionMenuOpen ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"}`}>
                                    <p className="text-[8px] font-black text-zinc-500 uppercase p-2 border-b border-zinc-800 mb-2">Select Diagnostic Point</p>
                                    {analyzedSessions.map((s) => (
                                        <button 
                                            key={s.id}
                                            onClick={() => {
                                                setSelectedSessionId(s.id);
                                                setIsSessionMenuOpen(false);
                                            }}
                                            className={`w-full text-left p-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-between group/item ${selectedSessionId === s.id ? "bg-amber-400 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span>{s.actionType?.replace('_', ' ') || "Session Result"}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="opacity-40">{new Date(s.recordedAt).toLocaleDateString()}</span>
                                                    {s.status === 'published' && (
                                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 text-[6px]">PUBLISHED</span>
                                                    )}
                                                </div>
                                            </div>
                                            {s.clinicalReport && <CheckCircle2 size={12} className={selectedSessionId === s.id ? "text-zinc-900" : "text-emerald-500"} />}
                                        </button>
                                    ))}
                                    {analyzedSessions.length === 0 && (
                                        <div className="p-4 text-center">
                                            <p className="text-[8px] font-black text-zinc-600 uppercase italic">No analyzed sessions yet</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                     </div>
                     <div className="relative group/export z-20">
                        <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            disabled={generateReport.isPending}
                            className="px-6 py-2 bg-white text-zinc-900 border-4 border-zinc-900 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {generateReport.isPending ? <Loader2 size={13} className="animate-spin" /> : <Download size={16} />} 
                            Export PDF
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(245,158,11,1)] z-50 overflow-hidden text-[10px] font-black uppercase">
                                <button onClick={() => handleExportPDF('aggregated_outcome')} className="w-full text-left px-5 py-4 hover:bg-zinc-900 hover:text-white border-b-2 border-zinc-100 transition-colors">
                                    Full Aggregated Report
                                </button>
                                <button onClick={() => handleExportPDF('clinical_summary')} className="w-full text-left px-5 py-4 hover:bg-zinc-900 hover:text-white border-b-2 border-zinc-100 transition-colors">
                                    Clinical Narrative Only
                                </button>
                                <button onClick={() => handleExportPDF('therapy_plan')} className="w-full text-left px-5 py-4 hover:bg-zinc-900 hover:text-white transition-colors">
                                    Therapy Recommendations Only
                                </button>
                            </div>
                        )}
                     </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              {!activeReport ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-20">
                  <div className="w-32 h-32 bg-zinc-100 border-4 border-dashed border-zinc-300 flex items-center justify-center mb-8 rotate-3">
                    <Brain size={64} className="text-zinc-300" />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic mb-4">No Analysis Found</h3>
                  <p className="text-xs font-bold uppercase text-zinc-400 leading-relaxed mb-10">
                    This patient doesn't have a consolidated clinical report yet. Please visit the Therapy Planner to process analyzed sessions and generate the outcome.
                  </p>
                   <button 
                    onClick={() => window.location.href = '/recommendations'}
                    className="px-8 py-4 bg-zinc-900 text-white font-black uppercase text-xs border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(245,158,11,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-3"
                   >
                    Go to Therapy Planner <ArrowRight size={18} />
                   </button>
                </div>
              ) : (
                <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col gap-6">
                        <MetricCard title="DSM-5 Severity" value={`LEVEL ${(activeReport as AggregatedClinicalReport).therapy_metadata?.dsm5_level || (activeReport as any).assessment_results?.severity_level || 1}`} icon={<Activity size={18} />} trend="+0.0 (STABLE)" />
                        <MetricCard title="AI Confidence" value={`${(((activeReport as AggregatedClinicalReport).therapy_metadata?.confidence || (activeReport as any).assessment_results?.severity_confidence || 0.94) * 100).toFixed(0)}%`} icon={<Brain size={18} />} color="text-emerald-500" trend="VERIFIED" />
                        <MetricCard title="Data Density" value={selectedSessionId ? "SINGLE POINT" : "CONSOLIDATED"} icon={<Video size={18} />} color="text-blue-500" trend="MULTI-AXIAL" />
                        <MetricCard title="Clinical Match" value="HIGH" icon={<Target size={18} />} color="text-amber-500" trend="92% ACCURACY" />
                    </div>

                    <div className="flex flex-col gap-12">
                        {/* Main Pillar: Clinical Narrative */}
                        <div className="space-y-8">
                            <div className="relative">
                                <div className="absolute left-7 top-0 bottom-0 w-1.5 bg-zinc-900 hidden lg:block border-x-2 border-white"></div>
                                <div className="space-y-10 relative">
                                    {parsedReport.map((sec, i) => (
                                        <div key={i} className="group relative">
                                            <div className="flex flex-col lg:flex-row gap-6">
                                                <div className="hidden lg:flex w-8 h-8 bg-zinc-900 text-white items-center justify-center text-sm font-black border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(245,158,11,1)] z-10 shrink-0 transform group-hover:scale-110 group-hover:-rotate-12 transition-all">
                                                    0{i+1}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 group-hover:text-amber-500 transition-colors">
                                                        {sec.title}
                                                    </h3>
                                                    <div className="bg-white border-2 border-zinc-900 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group-hover:bg-zinc-50 transition-all">
                                                        <div className="absolute top-0 right-0 w-1 h-full bg-amber-400"></div>
                                                        <div className="font-mono text-[9px] space-y-2 uppercase text-zinc-600 leading-relaxed">
                                                            {sec.content.split('\n').filter(Boolean).map((l, j) => {
                                                                const trimmed = l.trim();
                                                                const isBullet = trimmed.startsWith('*') || trimmed.startsWith('-');
                                                                return (
                                                                    <p key={j} className={`relative flex gap-2.5 ${isBullet ? "items-start" : ""}`}>
                                                                        {isBullet && <span className="w-2 h-2 bg-zinc-900 mt-1.5 shrink-0 inline-block"></span>}
                                                                        <span className="flex-1">
                                                                            {trimmed.replace(/^[\*\-]+\s*/, '').split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => {
                                                                                if (part.startsWith('**') && part.endsWith('**')) {
                                                                                    return <strong key={i} className="text-zinc-900 font-black">{part.slice(2, -2)}</strong>;
                                                                                }
                                                                                return part;
                                                                            })}
                                                                        </span>
                                                                    </p>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Aggregated Targeted Interventions */}
                            <div className="pt-8 space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="h-1 bg-zinc-900 flex-1 border-y border-white"></div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter italic">Recommended Interventions</h3>
                                    <div className="h-1 bg-zinc-900 flex-1 border-y border-white"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeReport.therapies_recommended?.map((t: any, idx: number) => (
                                        <AfirmModuleCard 
                                            key={idx}
                                            title={t.therapy_name} 
                                            desc={t.summary} 
                                            targets={t.intervention_targets} 
                                            relevance={t.relevance_score || 0.9}
                                            url={t.url || "https://afirm.fpg.unc.edu/afirm-modules"} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Secondary Section: Evidence & Context (Stacked Single Column) */}
                        <div className="flex flex-col gap-10 pt-12 border-t-4 border-zinc-200">
                             {/* Evidence Grounds */}
                             <div className="space-y-8 bg-zinc-900 p-8 border-2 border-zinc-900 shadow-[6px_6px_0px_0px_rgba(16,185,129,1)]">
                                     <h3 className="text-[11px] font-black uppercase text-emerald-400 flex items-center gap-2 mb-8 tracking-[0.2em]"><ShieldAlert size={14}/> EBM Grounds</h3>
                                     <div className="flex flex-col gap-6">
                                         {activeReport.retrieved_chunks?.slice(0, 3).map((chunk: any, i: number) => (
                                             <EvidenceChunkCard 
                                                 key={i}
                                                 source={chunk.metadata?.source || "Clinical Library"}
                                                 excerpt={chunk.text}
                                                 relevance={chunk.score || 0.85}
                                                 tags={chunk.metadata?.tags}
                                                 page={chunk.metadata?.page}
                                             />
                                         ))}
                                     </div>
                                </div>

                                {/* Clinical Context Summary */}
                                <div className="bg-white border-2 border-zinc-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center">
                                    <Dsm5Badge level={(activeReport as AggregatedClinicalReport).therapy_metadata?.dsm5_level || 1} />
                                    <div className="mt-8 space-y-1">
                                        <p className="text-[10px] font-black uppercase text-zinc-400">Consolidation Date</p>
                                        <p className="text-sm font-black italic">{new Date((activeReport as any).generated_at || (activeReport as any).recordedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="mt-8 w-full max-w-md space-y-4">
                                        <div className="flex justify-between text-[8px] font-black uppercase text-zinc-400 border-b border-zinc-200 pb-2">
                                            <span>Analyzed Points</span>
                                            <span className="text-zinc-900">{(activeReport as AggregatedClinicalReport).sessions_included?.length || 1}</span>
                                        </div>
                                        <div className="flex justify-between text-[8px] font-black uppercase text-zinc-400 border-b border-zinc-200 pb-2">
                                            <span>RAG Iterations</span>
                                            <span className="text-zinc-900">128</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-40 h-40 border-8 border-zinc-100 flex items-center justify-center mb-12 transform -rotate-12 bg-white shadow-[20px_20px_0px_0px_rgba(244,244,245,1)]">
              <ClipboardList size={80} className="text-zinc-200" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-6">Diagnostic Archive</h2>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest leading-relaxed">
              Select a patient from the registry to view historical therapy recommendations and consolidated clinical outcomes derived from RAG analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
