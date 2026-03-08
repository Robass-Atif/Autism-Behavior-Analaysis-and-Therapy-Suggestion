import { Injectable } from "@nestjs/common";
import * as PDFDocument from "pdfkit";
import { PDFDocument as PDFLib } from "pdf-lib";

export interface ReportOptions {
  patientId: string;
  sessionId?: string;
  includeGoals?: boolean;
  includeCharts?: boolean;
  includeTables?: boolean;
  includeNotes?: boolean;
  watermark?: boolean;
  password?: string;
  reportType?: string;
}

// Colors
const C = {
  black: "#18181b",
  dark: "#27272a",
  mid: "#52525b",
  light: "#a1a1aa",
  faint: "#e4e4e7",
  bg: "#f4f4f5",
  white: "#ffffff",
  green: "#16a34a",
  greenLight: "#bbf7d0",
  red: "#dc2626",
  redLight: "#fecaca",
  amber: "#d97706",
  amberLight: "#fde68a",
  blue: "#2563eb",
  blueLight: "#bfdbfe",
  purple: "#7c3aed",
  purpleLight: "#ddd6fe",
  teal: "#0d9488",
};

@Injectable()
export class PdfGeneratorService {
  async generatePatientReport(
    patientData: any,
    goalsData: any[],
    sessionsData: any[],
    options: ReportOptions,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 40, bottom: 50, left: 45, right: 45 },
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on("data", (chunk: any) => chunks.push(chunk));
        doc.on("end", async () => {
          let pdfBuffer = Buffer.concat(chunks);
          if (options.password) {
            pdfBuffer = (await this.addPasswordProtection(
              pdfBuffer,
              options.password,
            )) as any;
          }
          resolve(pdfBuffer);
        });

        const W = 505; // usable width
        const LEFT = 45;
        const RIGHT = 550;
        const isSessionReport =
          options.reportType === "session" || !!options.sessionId;

        // ── COVER / HEADER ──
        if (options.watermark) {
          this.addWatermark(doc);
        }

        // Top accent bar
        doc.rect(0, 0, 595, 6).fillColor(C.black).fill();

        doc.moveDown(2);
        doc
          .fontSize(28)
          .font("Helvetica-Bold")
          .fillColor(C.black)
          .text("NEUROCARE", LEFT, 50, { align: "center" });
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(C.light)
          .text("AUTISM BEHAVIOR ANALYSIS & THERAPY SYSTEM", {
            align: "center",
          });
        doc.moveDown(0.5);

        // Divider
        doc
          .moveTo(LEFT, doc.y)
          .lineTo(RIGHT, doc.y)
          .strokeColor(C.black)
          .lineWidth(2)
          .stroke();
        doc.moveDown(0.3);
        doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).lineWidth(0.5).stroke();
        doc.moveDown(1);

        // Report title
        const reportTitle =
          isSessionReport
            ? "SINGLE SESSION CLINICAL REPORT"
            : options.reportType === "progress"
            ? "PROGRESS REPORT (QUARTERLY)"
            : options.reportType === "consolidated"
              ? "CONSOLIDATED ANALYSIS REPORT"
              : "CLINICAL SUMMARY REPORT";
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor(C.black)
          .text(reportTitle, { align: "center" });
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(C.light)
          .text(
            `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
            { align: "center" },
          );
        if (isSessionReport && patientData?.reportSession) {
          const rs = patientData.reportSession;
          const label = rs?.actionType
            ? String(rs.actionType).replace(/_/g, " ")
            : "Video Session";
          const dateText = rs?.recordedAt
            ? new Date(rs.recordedAt).toLocaleDateString()
            : "Unknown date";
          doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor(C.mid)
            .text(`Session: ${label} | Recorded: ${dateText}`, {
              align: "center",
            });
        }
        doc.moveDown(1.5);

        // ── PATIENT INFORMATION ──
        this.sectionHeader(doc, "PATIENT INFORMATION", LEFT, W);

        const dobTime = patientData.dob
          ? new Date(patientData.dob).getTime()
          : Number.NaN;
        const age = Number.isFinite(dobTime)
          ? Math.floor((Date.now() - dobTime) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        const infoY = doc.y;
        // Left column
        this.infoRow(
          doc,
          "Patient Name",
          patientData.fullName || "N/A",
          LEFT,
          infoY,
        );
        this.infoRow(doc, "MRN", patientData.mrn || "N/A", LEFT, infoY + 18);
        this.infoRow(
          doc,
          "Date of Birth",
          patientData.dob
            ? new Date(patientData.dob).toLocaleDateString()
            : "N/A",
          LEFT,
          infoY + 36,
        );
        this.infoRow(
          doc,
          "Age",
          age !== null ? `${age} years` : "N/A",
          LEFT,
          infoY + 54,
        );

        // Right column
        this.infoRow(
          doc,
          "ASD Severity",
          patientData.asdSeverity || "N/A",
          300,
          infoY,
        );
        this.infoRow(
          doc,
          "Status",
          patientData.status || "N/A",
          300,
          infoY + 18,
        );
        this.infoRow(
          doc,
          "Therapist",
          patientData.therapistName || "N/A",
          300,
          infoY + 36,
        );
        this.infoRow(
          doc,
          "Report Date",
          new Date().toLocaleDateString(),
          300,
          infoY + 54,
        );

        doc.y = infoY + 75;
        doc.moveDown(1);

        // ── SESSION STATISTICS ──
        const analyzedSessions = sessionsData.filter(
          (s) =>
            s.status === "analyzed" ||
            s.status === "completed" ||
            s.status === "therapist_review" ||
            s.status === "published",
        );
        const pendingSessions = sessionsData.filter(
          (s) =>
            s.status === "pending_review" || s.status === "approved_for_ai",
        );

        this.sectionHeader(doc, "SESSION OVERVIEW", LEFT, W);

        const statsY = doc.y;
        const statW = W / 4 - 6;
        this.statBox(
          doc,
          sessionsData.length.toString(),
          "Total Sessions",
          LEFT,
          statsY,
          statW,
          C.black,
        );
        this.statBox(
          doc,
          analyzedSessions.length.toString(),
          "Analyzed",
          LEFT + statW + 8,
          statsY,
          statW,
          C.green,
        );
        this.statBox(
          doc,
          pendingSessions.length.toString(),
          "Pending",
          LEFT + (statW + 8) * 2,
          statsY,
          statW,
          C.amber,
        );
        const publishedCount = sessionsData.filter(
          (s) => s.status === "published",
        ).length;
        this.statBox(
          doc,
          publishedCount.toString(),
          "Published",
          LEFT + (statW + 8) * 3,
          statsY,
          statW,
          C.blue,
        );

        doc.y = statsY + 55;
        doc.moveDown(1);

        if (isSessionReport && sessionsData.length > 0) {
          const session = sessionsData[0];
          const reviewedSeverity =
            session?.therapistReview?.isOverridden &&
            session?.therapistReview?.overrideSeverity != null
              ? session.therapistReview.overrideSeverity
              : session?.ensemblePrediction?.severity;
          const durationLabel =
            typeof session?.duration === "number"
              ? `${Math.round(session.duration)} seconds`
              : "N/A";

          this.checkPage(doc, 90);
          this.sectionHeader(doc, "SESSION DETAILS", LEFT, W);

          const details = [
            {
              label: "Session ID",
              value: session?._id?.toString?.() || session?.id || "N/A",
            },
            {
              label: "Action Type",
              value: session?.actionType
                ? String(session.actionType).replace(/_/g, " ")
                : "N/A",
            },
            {
              label: "Recorded At",
              value: session?.recordedAt
                ? new Date(session.recordedAt).toLocaleString()
                : "N/A",
            },
            {
              label: "Status",
              value: session?.status
                ? String(session.status).replace(/_/g, " ")
                : "N/A",
            },
            {
              label: "Duration",
              value: durationLabel,
            },
            {
              label: "Reviewed Severity",
              value:
                reviewedSeverity === null || reviewedSeverity === undefined
                  ? "N/A"
                  : String(reviewedSeverity),
            },
          ];

          details.forEach((row, index) => {
            const y = doc.y;
            doc.rect(LEFT, y, W, 14).fillColor(index % 2 === 0 ? C.bg : C.white).fill();
            doc
              .fontSize(7)
              .font("Helvetica-Bold")
              .fillColor(C.mid)
              .text(row.label, LEFT + 6, y + 4, { width: 130 });
            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor(C.dark)
              .text(String(row.value), LEFT + 136, y + 4, { width: W - 142 });
            doc.y = y + 15;
          });

          doc.moveDown(0.6);
        }

        // AI ANALYSIS (full model-response view per session)
        const sessionsWithAI = sessionsData
          .filter((s) => this.hasMeaningfulAIData(s))
          .sort(
            (a, b) =>
              new Date(b.recordedAt || 0).getTime() -
              new Date(a.recordedAt || 0).getTime(),
          );
        const reportMode = options.reportType || "individual";
        const sessionsToRender =
          isSessionReport
            ? sessionsWithAI.slice(0, 1)
            : reportMode === "individual"
              ? sessionsWithAI.slice(0, 1)
              : reportMode === "progress"
                ? sessionsWithAI.slice(0, 6)
                : sessionsWithAI;

        if (options.includeCharts !== false && sessionsToRender.length > 0) {
          sessionsToRender.forEach((session, idx) => {
            this.renderAiSession(doc, session, idx, LEFT, W);
          });
        }

        const shouldIncludeGoals =
          reportMode === "consolidated" ||
          (reportMode === "individual" && options.includeGoals);
        if (shouldIncludeGoals && goalsData.length > 0) {
          this.checkPage(doc, 100);
          this.sectionHeader(doc, "THERAPY GOALS", LEFT, W);

          goalsData.forEach((goal, index) => {
            this.checkPage(doc, 45);

            doc
              .fontSize(9)
              .font("Helvetica-Bold")
              .fillColor(C.black)
              .text(
                `${index + 1}. ${goal.title || goal.goalName || "Untitled"}`,
                LEFT,
              );

            const meta = [
              goal.category && `Category: ${goal.category}`,
              goal.priority && `Priority: ${goal.priority}`,
              goal.status && `Status: ${goal.status}`,
            ]
              .filter(Boolean)
              .join("  |  ");

            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor(C.light)
              .text(meta, LEFT);

            // Progress bar
            const progress = goal.progress || 0;
            const barY = doc.y + 3;
            doc
              .rect(LEFT, barY, W * 0.6, 8)
              .fillColor(C.faint)
              .fill();
            doc
              .rect(LEFT, barY, (W * 0.6 * progress) / 100, 8)
              .fillColor(
                progress >= 75 ? C.green : progress >= 40 ? C.amber : C.blue,
              )
              .fill();
            doc
              .fontSize(7)
              .font("Helvetica-Bold")
              .fillColor(C.dark)
              .text(`${progress}%`, LEFT + W * 0.6 + 8, barY);

            doc.y = barY + 15;
          });
          doc.moveDown(0.5);
        }

        // ── SESSION TABLE ──
        const shouldIncludeTables =
          !isSessionReport &&
          (reportMode === "consolidated" ||
            (reportMode !== "progress" && options.includeTables));
        if (shouldIncludeTables && sessionsData.length > 0) {
          this.checkPage(doc, 100);
          this.sectionHeader(doc, "SESSION HISTORY", LEFT, W);

          const cols = [LEFT, LEFT + 90, LEFT + 200, LEFT + 310, LEFT + 410];
          const colLabels = [
            "Date",
            "Action Type",
            "Status",
            "AI Score",
            "Duration",
          ];
          const tableY = doc.y;

          doc.rect(LEFT, tableY, W, 16).fillColor(C.black).fill();
          doc.fontSize(7).font("Helvetica-Bold").fillColor(C.white);
          colLabels.forEach((l, i) => doc.text(l, cols[i] + 4, tableY + 4));

          sessionsData.slice(0, 15).forEach((s, ri) => {
            const ry = tableY + 16 + ri * 16;
            if (ry > 740) return; // don't overflow
            doc
              .rect(LEFT, ry, W, 16)
              .fillColor(ri % 2 === 0 ? C.bg : C.white)
              .fill();
            doc.fontSize(7).font("Helvetica").fillColor(C.dark);
            doc.text(
              s.recordedAt
                ? new Date(s.recordedAt).toLocaleDateString()
                : "N/A",
              cols[0] + 4,
              ry + 4,
            );
            doc.text(s.actionType || "N/A", cols[1] + 4, ry + 4, {
              width: 105,
              ellipsis: true,
            });
            doc.text(s.status || "N/A", cols[2] + 4, ry + 4);
            const aiScore = s.ensemblePrediction?.severity ?? s.aiConfidence;
            doc.text(
              aiScore != null ? String(aiScore) : "N/A",
              cols[3] + 4,
              ry + 4,
            );
            doc.text(
              s.duration ? `${Math.round(s.duration)}s` : "N/A",
              cols[4] + 4,
              ry + 4,
            );
          });

          doc
            .rect(LEFT, tableY, W, 16 + Math.min(sessionsData.length, 15) * 16)
            .strokeColor(C.faint)
            .lineWidth(0.5)
            .stroke();

          doc.y = tableY + 16 + Math.min(sessionsData.length, 15) * 16 + 10;
          doc.moveDown(0.5);
        }

        // ── LONGITUDINAL TREND (if multiple analyzed sessions) ──
        const shouldIncludeTrend =
          !isSessionReport &&
          (reportMode === "progress" || reportMode === "consolidated") &&
          analyzedSessions.length >= 2;
        if (shouldIncludeTrend) {
          this.checkPage(doc, 140);
          this.sectionHeader(doc, "LONGITUDINAL TREND", LEFT, W);

          doc
            .fontSize(8)
            .font("Helvetica")
            .fillColor(C.mid)
            .text(
              `Tracking ${analyzedSessions.length} analyzed sessions over time`,
              LEFT,
            );
          doc.moveDown(0.3);

          // Draw severity trend as a simple line chart
          const chartX = LEFT + 30;
          const chartW = W - 60;
          const chartH = 80;
          const chartY = doc.y;

          // Y axis
          doc
            .moveTo(chartX, chartY)
            .lineTo(chartX, chartY + chartH)
            .strokeColor(C.faint)
            .lineWidth(0.5)
            .stroke();
          // X axis
          doc
            .moveTo(chartX, chartY + chartH)
            .lineTo(chartX + chartW, chartY + chartH)
            .stroke();

          // Y axis labels (severity 0-3)
          for (let i = 0; i <= 3; i++) {
            const ly = chartY + chartH - (chartH * i) / 3;
            doc
              .fontSize(6)
              .font("Helvetica")
              .fillColor(C.light)
              .text(String(i), LEFT, ly - 3);
            doc
              .moveTo(chartX, ly)
              .lineTo(chartX + chartW, ly)
              .strokeColor(C.faint)
              .lineWidth(0.3)
              .stroke();
          }

          // Plot severity points (newest last, reverse for chronological)
          const sorted = [...analyzedSessions]
            .sort(
              (a, b) =>
                new Date(a.recordedAt).getTime() -
                new Date(b.recordedAt).getTime(),
            )
            .slice(-10); // last 10

          const stepX = chartW / Math.max(sorted.length - 1, 1);

          sorted.forEach((s, i) => {
            const sev =
              s.ensemblePrediction?.severity ??
              s.rawPredictionResponse?.ensemble_prediction?.severity ??
              0;
            const px = chartX + i * stepX;
            const py = chartY + chartH - (chartH * Math.min(sev, 3)) / 3;

            // Connect dots
            if (i > 0) {
              const prevSev =
                sorted[i - 1].ensemblePrediction?.severity ??
                sorted[i - 1].rawPredictionResponse?.ensemble_prediction
                  ?.severity ??
                0;
              const prevPx = chartX + (i - 1) * stepX;
              const prevPy =
                chartY + chartH - (chartH * Math.min(prevSev, 3)) / 3;
              doc
                .moveTo(prevPx, prevPy)
                .lineTo(px, py)
                .strokeColor(C.blue)
                .lineWidth(1.5)
                .stroke();
            }

            // Dot
            doc.circle(px, py, 3).fillColor(C.blue).fill();

            // Date label
            if (sorted.length <= 6 || i % 2 === 0) {
              doc
                .fontSize(5)
                .font("Helvetica")
                .fillColor(C.light)
                .text(
                  new Date(s.recordedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  px - 15,
                  chartY + chartH + 3,
                  { width: 30, align: "center" },
                );
            }
          });

          doc
            .fontSize(7)
            .font("Helvetica-Bold")
            .fillColor(C.blue)
            .text("● Severity Level Over Time", chartX, chartY - 10);

          doc.y = chartY + chartH + 18;
          doc.moveDown(0.5);
        }

        // We removed the duplicate concatenated notes block from here
        // as notes are already appropriately printed inside their respective Session Blocks.

        // ── FOOTER on all pages ──
        this.addFooter(doc, patientData.therapistName);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ── Helper methods ──

  private sectionHeader(doc: any, title: string, x: number, w: number) {
    doc.moveDown(0.3);
    const y = doc.y;
    doc.rect(x, y, w, 20).fillColor(C.black).fill();
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(C.white)
      .text(title, x + 8, y + 6, { lineBreak: false });
    doc.y = y + 22;
    doc.moveDown(0.5);
  }

  private infoRow(
    doc: any,
    label: string,
    value: string,
    x: number,
    y: number,
  ) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor(C.light).text(label, x, y);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(C.black)
      .text(String(value), x + 85, y);
  }

  private statBox(
    doc: any,
    value: string,
    label: string,
    x: number,
    y: number,
    w: number,
    color: string,
  ) {
    doc.rect(x, y, w, 45).fillColor(C.bg).fill();
    doc.rect(x, y, w, 3).fillColor(color).fill();
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(color)
      .text(value, x, y + 10, { width: w, align: "center" });
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .fillColor(C.light)
      .text(label.toUpperCase(), x, y + 32, { width: w, align: "center" });
  }

  private metricBar(
    doc: any,
    label: string,
    value: any,
    confidence: number | null,
    max: number,
    color: string,
    x: number,
    w: number,
  ) {
    const y = doc.y;
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(C.dark)
      .text(label, x, y, { width: 120 });

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(color)
      .text(String(value), x + 120, y - 1, { width: 50 });

    // Bar background
    const barX = x + 175;
    const barW = w - 240;
    doc
      .rect(barX, y + 2, barW, 8)
      .fillColor(C.faint)
      .fill();
    // Bar fill
    const numVal = typeof value === "number" ? value : parseFloat(value) || 0;
    const fillW = Math.min((numVal / max) * barW, barW);
    doc
      .rect(barX, y + 2, fillW, 8)
      .fillColor(color)
      .fill();

    // Confidence
    if (confidence != null) {
      doc
        .fontSize(6)
        .font("Helvetica")
        .fillColor(C.light)
        .text(
          `${(confidence * 100).toFixed(0)}% conf.`,
          barX + barW + 5,
          y + 2,
        );
    }

    doc.y = y + 16;
  }

  private hasMeaningfulAIData(session: any): boolean {
    const raw = this.getRawPrediction(session);
    return Boolean(
      session?.ensemblePrediction ||
        raw?.ensemble_prediction ||
        raw?.predictions_2d ||
        raw?.predictions_3d ||
        raw?.processing_info ||
        session?.aiAnalysis?.summary ||
        (Array.isArray(session?.aiAnalysis?.behaviors) &&
          session.aiAnalysis.behaviors.length > 0),
    );
  }

  private getRawPrediction(session: any): any {
    const raw = session?.rawPredictionResponse;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (typeof raw === "object") {
      return raw;
    }
    return {};
  }

  private renderAiSession(
    doc: any,
    session: any,
    idx: number,
    left: number,
    width: number,
  ) {
    this.checkPage(doc, 100);

    const raw = this.getRawPrediction(session);
    const ensemble = session.ensemblePrediction || raw.ensemble_prediction;
    const pred2d = raw.predictions_2d;
    const pred3d = raw.predictions_3d;
    const processingInfo =
      raw.processing_info || session.aiAnalysis?.rawPrediction?.processingInfo;
    const inputAge = raw.input_age ?? pred2d?.input_age ?? pred3d?.input_age;
    const inputGender =
      raw.input_gender ?? pred2d?.input_gender ?? pred3d?.input_gender;

    const sessionDate = session.recordedAt
      ? new Date(session.recordedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Unknown Date";

    this.sectionHeader(
      doc,
      `AI ANALYSIS - SESSION ${idx + 1} (${sessionDate})`,
      left,
      width,
    );

    const metadata = [
      session.status && `Status: ${String(session.status).replace(/_/g, " ")}`,
      session.actionType &&
        `Action: ${String(session.actionType).replace(/_/g, " ")}`,
      inputAge !== null &&
        inputAge !== undefined &&
        String(inputAge).trim() !== "" &&
        `Input Age: ${inputAge}`,
      inputGender &&
        String(inputGender).trim() !== "" &&
        `Input Gender: ${inputGender}`,
      raw.status && `Model Status: ${raw.status}`,
    ]
      .filter(Boolean)
      .join("  |  ");

    if (metadata) {
      doc.fontSize(7).font("Helvetica").fillColor(C.mid).text(metadata, left);
      doc.moveDown(0.3);
    }

    if (ensemble) {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(C.black)
        .text("ADOS-2 Ensemble Prediction", left);
      doc.moveDown(0.3);

      const metrics = [
        {
          label: "Severity Level",
          value: ensemble.severity ?? "N/A",
          confidence: ensemble.severity_confidence,
          max: 3,
          color: C.red,
        },
        {
          label: "Social Affect",
          value: this.formatMaybeNumber(ensemble.social_affect, 1),
          confidence: null,
          max: 30,
          color: C.blue,
        },
        {
          label: "RRB Score",
          value: this.formatMaybeNumber(ensemble.rrb, 1),
          confidence: null,
          max: 10,
          color: C.purple,
        },
        {
          label: "Comparison Score",
          value: ensemble.comparison_score ?? "N/A",
          confidence: ensemble.comparison_confidence,
          max: 10,
          color: C.teal,
        },
      ];

      metrics.forEach((m) => {
        this.checkPage(doc, 26);
        this.metricBar(
          doc,
          m.label,
          m.value,
          m.confidence,
          m.max,
          m.color,
          left,
          width,
        );
      });

      const adosTotal =
        typeof ensemble.social_affect === "number" && typeof ensemble.rrb === "number"
          ? ensemble.social_affect + ensemble.rrb
          : null;
      if (adosTotal != null) {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(C.dark)
          .text(`ADOS Total (SA + RRB): ${adosTotal.toFixed(1)}`, left);
        doc.moveDown(0.3);
      }
    }

    if (pred2d && pred3d) {
      this.renderModelComparisonTable(doc, pred2d, pred3d, ensemble, left, width);
    }

    if (pred2d?.explainability) {
      this.renderModelExplainability(doc, "2D MODEL", pred2d, left, width);
    }
    if (pred3d?.explainability) {
      this.renderModelExplainability(doc, "3D MODEL", pred3d, left, width);
    }

    const behaviors = Array.isArray(session.aiAnalysis?.behaviors)
      ? [...session.aiAnalysis.behaviors].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        )
      : [];

    if (behaviors.length > 0) {
      const displayedBehaviors = behaviors.slice(0, 30);
      this.checkPage(doc, 40);
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(C.dark)
        .text("Behavior Event Log", left);
      doc.moveDown(0.2);

      displayedBehaviors.forEach((b: any) => {
        this.checkPage(doc, 16);
        const y = doc.y;
        doc.rect(left, y, width, 13).fillColor(C.bg).fill();

        const severityLabel = b.severity || "N/A";
        const severityColor =
          severityLabel === "High"
            ? C.red
            : severityLabel === "Medium"
              ? C.amber
              : C.blue;

        doc
          .fontSize(7)
          .font("Helvetica-Bold")
          .fillColor(C.dark)
          .text(`[${Math.floor(b.timestamp || 0)}s]`, left + 4, y + 3, { width: 40 });
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(C.dark)
          .text(b.type || "Behavior", left + 44, y + 3, { width: 170 });
        doc
          .font("Helvetica-Bold")
          .fillColor(severityColor)
          .text(severityLabel, left + 214, y + 3, { width: 60 });
        doc
          .font("Helvetica")
          .fillColor(C.mid)
          .text(
            `Confidence: ${
              typeof b.confidence === "number"
                ? `${Math.round(b.confidence * 100)}%`
                : "N/A"
            }`,
            left + 280,
            y + 3,
          );
        doc.y = y + 15;
      });
      if (behaviors.length > displayedBehaviors.length) {
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(C.light)
          .text(
            `Showing first ${displayedBehaviors.length} of ${behaviors.length} behavior events`,
            left,
          );
      }
      doc.moveDown(0.2);
    }

    const summary = this.pickAiSummary(session, pred2d, pred3d);
    if (summary) {
      this.checkPage(doc, 50);
      doc.rect(left, doc.y, width, 1).fillColor(C.faint).fill();
      doc.moveDown(0.3);
      doc
        .fontSize(8)
        .font("Helvetica-Oblique")
        .fillColor(C.mid)
        .text(summary, left, doc.y, { width });
      doc.moveDown(0.5);
    }

    if (session.therapistReview) {
      this.checkPage(doc, 80);
      this.sectionHeader(doc, "THERAPIST REVIEW", left, width);

      const review = session.therapistReview;
      const overrideSeverity =
        review.overrideSeverity ?? review.severityOverride ?? null;
      const reviewNotes = review.reviewNotes || review.notes;

      if (overrideSeverity != null) {
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(C.dark)
          .text(`Severity Override: Level ${overrideSeverity}`, left);
      }

      if (reviewNotes) {
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(C.mid)
          .text(reviewNotes, left, doc.y + 3, { width });
      }

      if (review.therapyPlanAdjustments) {
        doc.moveDown(0.3);
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(C.dark)
          .text("Therapy Plan Adjustments:", left);
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(C.mid)
          .text(review.therapyPlanAdjustments, left, doc.y + 2, { width });
      }

      if (review.reviewedAt) {
        doc.moveDown(0.2);
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(C.light)
          .text(
            `Reviewed: ${new Date(review.reviewedAt).toLocaleDateString()}`,
            left,
          );
      }
      doc.moveDown(0.5);
    }

    if (processingInfo) {
      this.checkPage(doc, 28);
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(C.light)
        .text(
          `Processing: ${this.formatMaybeNumber(processingInfo.video_duration_seconds, 1)}s video | ${processingInfo.frames_extracted ?? "N/A"} frames | ${processingInfo.original_fps ?? "N/A"} fps | 2D poses: ${processingInfo.poses_2d_extracted ?? "N/A"} | 3D poses: ${processingInfo.poses_3d_extracted ?? "N/A"} | 3D enabled: ${
            processingInfo["3d_processing_enabled"] ? "Yes" : "No"
          }`,
          left,
          doc.y,
          { width },
        );
      doc.moveDown(0.6);
    }
  }

  private renderModelComparisonTable(
    doc: any,
    pred2d: any,
    pred3d: any,
    ensemble: any,
    left: number,
    width: number,
  ) {
    this.checkPage(doc, 120);
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(C.black)
      .text("2D vs 3D Model Comparison", left);
    doc.moveDown(0.2);

    const tableY = doc.y;
    const colW = width / 4;
    doc.rect(left, tableY, width, 16).fillColor(C.black).fill();
    doc.fontSize(7).font("Helvetica-Bold").fillColor(C.white);
    doc.text("Metric", left + 4, tableY + 4, { width: colW });
    doc.text("2D", left + colW + 4, tableY + 4, { width: colW });
    doc.text("3D", left + colW * 2 + 4, tableY + 4, { width: colW });
    doc.text("Ensemble", left + colW * 3 + 4, tableY + 4, { width: colW });

    const rows = [
      ["Severity", pred2d.severity, pred3d.severity, ensemble?.severity],
      [
        "Social Affect",
        this.formatMaybeNumber(pred2d.social_affect, 1),
        this.formatMaybeNumber(pred3d.social_affect, 1),
        this.formatMaybeNumber(ensemble?.social_affect, 1),
      ],
      [
        "RRB",
        this.formatMaybeNumber(pred2d.rrb, 1),
        this.formatMaybeNumber(pred3d.rrb, 1),
        this.formatMaybeNumber(ensemble?.rrb, 1),
      ],
      [
        "Comparison",
        pred2d.comparison_score,
        pred3d.comparison_score,
        ensemble?.comparison_score,
      ],
      [
        "Severity Conf",
        typeof pred2d.severity_confidence === "number"
          ? `${(pred2d.severity_confidence * 100).toFixed(1)}%`
          : "N/A",
        typeof pred3d.severity_confidence === "number"
          ? `${(pred3d.severity_confidence * 100).toFixed(1)}%`
          : "N/A",
        typeof ensemble?.severity_confidence === "number"
          ? `${(ensemble.severity_confidence * 100).toFixed(1)}%`
          : "N/A",
      ],
      [
        "Comparison Conf",
        typeof pred2d.comparison_confidence === "number"
          ? `${(pred2d.comparison_confidence * 100).toFixed(1)}%`
          : "N/A",
        typeof pred3d.comparison_confidence === "number"
          ? `${(pred3d.comparison_confidence * 100).toFixed(1)}%`
          : "N/A",
        typeof ensemble?.comparison_confidence === "number"
          ? `${(ensemble.comparison_confidence * 100).toFixed(1)}%`
          : "N/A",
      ],
    ];

    rows.forEach((row, i) => {
      const y = tableY + 16 + i * 16;
      doc.rect(left, y, width, 16).fillColor(i % 2 === 0 ? C.bg : C.white).fill();
      doc.fontSize(7).font("Helvetica").fillColor(C.dark);
      doc.text(String(row[0] ?? "N/A"), left + 4, y + 4, { width: colW });
      doc.text(String(row[1] ?? "N/A"), left + colW + 4, y + 4, { width: colW });
      doc.text(String(row[2] ?? "N/A"), left + colW * 2 + 4, y + 4, { width: colW });
      doc
        .font("Helvetica-Bold")
        .text(String(row[3] ?? "N/A"), left + colW * 3 + 4, y + 4, { width: colW });
    });

    doc
      .rect(left, tableY, width, 16 + rows.length * 16)
      .strokeColor(C.faint)
      .lineWidth(0.5)
      .stroke();
    doc.y = tableY + 16 + rows.length * 16 + 8;
  }

  private renderModelExplainability(
    doc: any,
    modelLabel: string,
    prediction: any,
    left: number,
    width: number,
  ) {
    const explain = prediction?.explainability;
    if (!explain) return;

    this.checkPage(doc, 50);
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(C.dark)
      .text(`${modelLabel} Explainability`, left);
    doc.moveDown(0.1);

    const videoMeta = explain.video_metadata || {};
    const metaText = [
      prediction.sequence_length != null &&
        `Sequence: ${prediction.sequence_length}`,
      videoMeta.duration_seconds != null &&
        `Duration: ${this.formatMaybeNumber(videoMeta.duration_seconds, 1)}s`,
      videoMeta.num_frames != null && `Frames: ${videoMeta.num_frames}`,
      videoMeta.fps != null && `FPS: ${videoMeta.fps}`,
    ]
      .filter(Boolean)
      .join("  |  ");
    if (metaText) {
      doc.fontSize(7).font("Helvetica").fillColor(C.mid).text(metaText, left);
      doc.moveDown(0.2);
    }

    const tasks = explain.task_explanations || {};
    Object.entries(tasks).forEach(([taskName, taskRaw]) => {
      const task: any = taskRaw || {};
      this.checkPage(doc, 60);

      const taskY = doc.y;
      doc.rect(left, taskY, width, 14).fillColor(C.bg).fill();
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(C.dark)
        .text(taskName, left + 4, taskY + 4);
      doc.y = taskY + 16;

      const confScore = task.confidence?.confidence_score;
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(C.mid)
        .text(
          `Prediction: ${this.formatMaybeNumber(task.prediction, 2)} | Baseline: ${this.formatMaybeNumber(task.baseline, 2)} | Confidence: ${
            typeof confScore === "number" ? `${confScore.toFixed(1)}%` : "N/A"
          }`,
          left + 4,
          doc.y,
          { width: width - 8 },
        );
      doc.moveDown(0.2);

      this.renderContributionBars(
        doc,
        "Positive Contributors",
        task.joints?.positive_contributors || [],
        left + 4,
        width - 8,
        true,
      );
      this.renderContributionBars(
        doc,
        "Negative Contributors",
        task.joints?.negative_contributors || [],
        left + 4,
        width - 8,
        false,
      );

      this.renderTemporalSegments(
        doc,
        task.temporal_segments?.all_segments || [],
        left + 4,
        width - 8,
      );

      const demo = task.demographic_contributions;
      if (demo || task.total_sequence_attribution != null) {
        this.checkPage(doc, 20);
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(C.mid)
          .text(
            `Demographics -> Age: ${
              demo?.age_contribution != null
                ? `${demo.age_contribution >= 0 ? "+" : ""}${demo.age_contribution.toFixed(4)}`
                : "N/A"
            }, Gender: ${
              demo?.gender_contribution != null
                ? `${demo.gender_contribution >= 0 ? "+" : ""}${demo.gender_contribution.toFixed(4)}`
                : "N/A"
            } | Sequence attribution: ${this.formatMaybeNumber(
              task.total_sequence_attribution,
              4,
            )} | Demographic attribution: ${this.formatMaybeNumber(
              task.total_demographic_attribution,
              4,
            )}`,
            left + 4,
            doc.y,
            { width: width - 8 },
          );
        doc.moveDown(0.25);
      }
    });
  }

  private renderContributionBars(
    doc: any,
    title: string,
    contributors: any[],
    left: number,
    width: number,
    positive: boolean,
  ) {
    this.checkPage(doc, 20);
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(positive ? C.green : C.red)
      .text(title, left, doc.y);
    doc.moveDown(0.1);

    if (!contributors.length) {
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(C.light)
        .text("No contributors reported", left + 2);
      doc.moveDown(0.2);
      return;
    }

    const maxAbs = Math.max(
      ...contributors.map((c) =>
        Math.abs(typeof c?.contribution === "number" ? c.contribution : 0),
      ),
      0.000001,
    );

    const displayedContributors = contributors.slice(0, 8);
    displayedContributors.forEach((item: any) => {
      this.checkPage(doc, 12);
      const y = doc.y;
      const rawValue =
        typeof item?.contribution === "number" ? item.contribution : 0;
      const ratio = Math.min(Math.abs(rawValue) / maxAbs, 1);
      const label = this.formatJointName(String(item?.joint || "Unknown"));
      const barX = left + 125;
      const barW = Math.max(width - 210, 60);

      doc
        .fontSize(6)
        .font("Helvetica")
        .fillColor(C.dark)
        .text(label, left, y + 2, { width: 120, ellipsis: true });

      doc.rect(barX, y + 3, barW, 6).fillColor(C.faint).fill();
      doc
        .rect(barX, y + 3, barW * ratio, 6)
        .fillColor(positive ? C.green : C.red)
        .fill();

      doc
        .fontSize(6)
        .font("Helvetica")
        .fillColor(C.mid)
        .text(rawValue.toFixed(6), barX + barW + 5, y + 1);

      doc.y = y + 11;
    });
    if (contributors.length > displayedContributors.length) {
      doc
        .fontSize(6)
        .font("Helvetica")
        .fillColor(C.light)
        .text(
          `Showing top ${displayedContributors.length} of ${contributors.length} contributors`,
          left + 2,
        );
      doc.moveDown(0.1);
    }
    doc.moveDown(0.15);
  }

  private renderTemporalSegments(
    doc: any,
    segments: any[],
    left: number,
    width: number,
  ) {
    this.checkPage(doc, 16);
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(C.dark)
      .text("Temporal Segments", left, doc.y);
    doc.moveDown(0.1);

    if (!segments.length) {
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(C.light)
        .text("No temporal segments reported", left + 2);
      doc.moveDown(0.2);
      return;
    }

    const displayedSegments = segments.slice(0, 12);
    displayedSegments.forEach((seg: any, idx: number) => {
      this.checkPage(doc, 16);
      const direction = seg?.influence_direction || "unknown";
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(direction === "positive" ? C.green : C.red)
        .text(
          `${idx + 1}. ${direction.toUpperCase()} | ${this.formatMaybeNumber(
            seg?.start_time,
            1,
          )}s-${this.formatMaybeNumber(seg?.end_time, 1)}s | frames ${
            seg?.start_frame ?? "N/A"
          }-${seg?.end_frame ?? "N/A"} | contribution ${this.formatMaybeNumber(
            seg?.contribution,
            4,
          )} | raw ${this.formatMaybeNumber(seg?.raw_attribution, 6)}`,
          left + 2,
          doc.y,
          { width: width - 4 },
        );
    });
    if (segments.length > displayedSegments.length) {
      doc
        .fontSize(6)
        .font("Helvetica")
        .fillColor(C.light)
        .text(
          `Showing first ${displayedSegments.length} of ${segments.length} temporal segments`,
          left + 2,
        );
      doc.moveDown(0.1);
    }
    doc.moveDown(0.2);
  }

  private pickAiSummary(session: any, pred2d: any, pred3d: any): string | null {
    const summary =
      pred2d?.explainability?.summary ||
      pred3d?.explainability?.summary ||
      session?.clinicalReport?.summary ||
      session?.aiAnalysis?.summary;

    if (!summary) return null;
    return typeof summary === "string" ? summary : JSON.stringify(summary);
  }

  private formatMaybeNumber(value: any, digits = 1): string {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "N/A";
    }
    return value.toFixed(digits);
  }

  private formatJointName(joint: string): string {
    return joint.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private checkPage(doc: any, needed: number) {
    const pageHeight = doc.page?.height || 842;
    const topMargin = doc.page?.margins?.top ?? 40;
    const bottomMargin = doc.page?.margins?.bottom ?? 50;
    const topY = topMargin + 8;
    const bottomY = pageHeight - bottomMargin - 8;
    const maxBlock = Math.max(bottomY - topY, 1);
    const required = Math.min(Math.max(needed, 0), maxBlock);

    if (doc.y + required > bottomY) {
      if (doc.y <= topY + 2) return;
      doc.addPage();
      doc.y = topY;
    }
  }

  private addWatermark(doc: any) {
    doc.save();
    doc
      .fontSize(60)
      .fillColor("#cccccc", 0.1)
      .rotate(-45, { origin: [300, 400] })
      .text("NEUROCARE", 100, 400, { align: "center", width: 500 });
    doc.restore();
  }

  private addFooter(doc: any, therapistName: string) {
    const pages = doc.bufferedPageRange();
    const displayTherapist =
      therapistName && therapistName !== "Unknown Therapist"
        ? therapistName
        : "NeuroCare System";

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Bottom accent bar
      doc.rect(0, 836, 595, 6).fillColor(C.black).fill();

      // Footer line
      doc
        .moveTo(45, 780)
        .lineTo(550, 780)
        .strokeColor(C.faint)
        .lineWidth(0.5)
        .stroke();

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(C.light)
        .text(`Page ${i + 1} of ${pages.count}`, 45, 786, { align: "left" });
      doc.text(`Generated by: ${displayTherapist}`, 45, 786, {
        align: "center",
      });
      doc.text(`${new Date().toLocaleDateString()}`, 45, 786, {
        align: "right",
      });

      doc
        .fontSize(6)
        .fillColor(C.light)
        .text(
          "CONFIDENTIAL - This report contains protected health information (PHI)",
          45,
          796,
          { align: "center" },
        );
    }
  }

  private async addPasswordProtection(
    pdfBuffer: Buffer,
    password: string,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFLib.load(pdfBuffer);
      (pdfDoc as any).encrypt({
        userPassword: password,
        ownerPassword: password + "_owner_key",
        permissions: {
          printing: "highResolution",
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });
      const encryptedPdfBytes = await pdfDoc.save();
      return Buffer.from(encryptedPdfBytes);
    } catch (error) {
      console.error("Error adding password protection:", error);
      throw new Error("Failed to add password protection to PDF");
    }
  }
}
