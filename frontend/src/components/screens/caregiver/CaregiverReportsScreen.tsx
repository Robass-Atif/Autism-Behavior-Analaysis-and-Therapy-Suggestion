import React, { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Lock,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import toast from "../../../lib/toast";
import { useVideoSessions, useGenerateReport } from "../../../api/clinical";

export default function CaregiverReportsScreen() {
  const { data: sessionsData, isLoading } = useVideoSessions();
  const generateReport = useGenerateReport();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const sessions = sessionsData?.sessions || [];
  const publishedSessions = sessions.filter(
    (s: any) => s.status === "published",
  );

  const handleDownload = async (report: any) => {
    setDownloadingId(report.id);
    const toastId = toast.loading("Generating PDF report...");

    try {
      const blob = await generateReport.mutateAsync({
        patientId: report.patientId,
        sessionId: report.id,
        includeGoals: false,
        includeCharts: true,
        includeTables: false,
        includeNotes: true,
        watermark: true,
        reportType: "session",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const name = (report.patientName || "Patient").replace(/\s+/g, "_");
      link.setAttribute(
        "download",
        `Session_Report_${name}_${report.id}_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("PDF Generation failed", error);
      toast.error("Failed to generate report. Please try again.", {
        id: toastId,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (report: any) => {
    setDownloadingId(report.id);
    const toastId = toast.loading("Generating preview...");

    try {
      const blob = await generateReport.mutateAsync({
        patientId: report.patientId,
        sessionId: report.id,
        includeGoals: false,
        includeCharts: true,
        includeTables: false,
        includeNotes: true,
        watermark: true,
        reportType: "session",
      });

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("Preview opened in new tab", { id: toastId });
    } catch (error) {
      console.error("PDF Preview failed", error);
      toast.error("Failed to generate preview. Please try again.", {
        id: toastId,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-mono selection:bg-zinc-100 p-8 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
              SHARED DOCUMENTATION
            </h3>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
              Clinical Reports
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 underline decoration-zinc-100 underline-offset-4">
              SECURE LINK TO THERAPIST ANALYSIS
            </p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-100 px-4 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
            <Lock size={12} className="text-zinc-900" /> Secure Access Only
          </div>
        </header>

        {/* Global Notice */}
        <div className="mb-12 border-l-4 border-zinc-900 bg-zinc-50 p-6 flex items-start gap-4">
          <ShieldCheck className="text-zinc-900 mt-0.5" size={20} />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed text-zinc-600">
            These diagnostic summaries have been shared by your primary
            therapist. Technical metrics are processed for caregiver
            readability. Contact support if document integrity is compromised.
          </p>
        </div>

        {/* Reports Registry */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
            REGISTRY ENTRIES
          </h3>

          {isLoading ? (
            <div className="py-12 flex justify-center text-zinc-400">
              <span className="text-xs uppercase tracking-widest font-black animate-pulse text-zinc-500">
                Retrieving Secure Documents...
              </span>
            </div>
          ) : publishedSessions.length === 0 ? (
            <div className="border border-zinc-100 p-12 text-center bg-zinc-50">
              <FileText size={32} className="mx-auto text-zinc-300 mb-4" />
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">
                No Published Reports Available
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase">
                Your therapist has not published any clinical reports yet.
              </p>
            </div>
          ) : (
            publishedSessions.map((report: any) => {
              const isProcessing = downloadingId === report.id;
              return (
                <div
                  key={report.id}
                  className="border border-zinc-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-zinc-50 hover:border-zinc-300 transition-all group relative"
                >
                  {/* Corner Accent */}
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100">
                    <div className="w-1.5 h-1.5 bg-zinc-900"></div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 group-hover:border-zinc-900 transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight mb-2 group-hover:translate-x-1 transition-transform">
                        {report.actionType
                          ? report.actionType.replace("_", " ") + " Analysis"
                          : "Session Review"}
                      </h3>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span>
                          DATE RELEASED:{" "}
                          {report.publishedAt
                            ? new Date(report.publishedAt).toLocaleDateString()
                            : "UNKNOWN"}
                        </span>
                        <span>PATIENT: {report.patientName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(report);
                      }}
                      disabled={isProcessing}
                      className="flex items-center gap-3 border border-zinc-900 text-zinc-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Eye size={14} />
                      )}{" "}
                      Preview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(report);
                      }}
                      disabled={isProcessing}
                      className="flex items-center gap-3 bg-zinc-900 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-900/10"
                    >
                      {isProcessing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}{" "}
                      Download
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Metadata */}
        <footer className="mt-24 pt-8 border-t border-zinc-100 flex justify-between">
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
            SYSTEM FS EXT4 | ENCRYPTED
          </div>
          <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
            HASH CHECK OK
          </div>
        </footer>
      </div>
    </div>
  );
}
