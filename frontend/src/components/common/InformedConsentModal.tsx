import React, { useEffect } from "react";
import {
	AlertTriangle,
	BrainCircuit,
	Camera,
	CheckCircle2,
	FileText,
	Lock,
	Scale,
	X,
} from "lucide-react";

export type ConsentDecision = {
	decision: "GRANTED" | "REVOKED";
	timestamp: string;
};

type InformedConsentModalProps = {
	isOpen: boolean;
	isGranted: boolean;
	consentHistory: ConsentDecision[];
	onClose: () => void;
	onGrant: () => void;
	onRevoke: () => void;
};

const formatTimestamp = (timestamp: string) => {
	const date = new Date(timestamp);
	if (isNaN(date.getTime())) return timestamp;

	return date.toLocaleString([], {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export default function InformedConsentModal({
	isOpen,
	isGranted,
	consentHistory,
	onClose,
	onGrant,
	onRevoke,
}: InformedConsentModalProps) {
	useEffect(() => {
		if (!isOpen) return;

		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-zinc-900/70 backdrop-blur-sm flex items-center justify-center p-4 overscroll-y-contain"
			role="dialog"
			aria-modal="true"
			aria-label="Informed consent document"
		>
			<div className="w-full max-w-4xl h-[92vh] overflow-hidden border border-zinc-200 bg-white text-zinc-900 shadow-2xl">
				<div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
					<div>
						<p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
							FR-13 Informed Consent Management
						</p>
						<h3 className="text-lg font-black uppercase tracking-tight">
							AI-Assisted Video Therapy Consent
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
						aria-label="Close informed consent modal"
					>
						<X size={18} />
					</button>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] min-h-0 h-[calc(92vh-76px)] overflow-y-auto lg:overflow-hidden overscroll-y-contain">
					<div className="min-h-0 lg:overflow-y-auto lg:overscroll-y-contain px-6 py-5 space-y-6 border-b lg:border-b-0 lg:border-r border-zinc-200">
						<Section
							icon={<Camera size={18} className="text-blue-600" />}
							title="1. Recording, Storage, Analysis, and Use"
							content="Patient videos are collected for clinical therapy analysis. Videos are encrypted in transit and at rest, stored with metadata such as action type and timestamp, and processed only by authorized personnel and approved services."
						/>

						<Section
							icon={<BrainCircuit size={18} className="text-emerald-600" />}
							title="2. AI Models, Capabilities, and Limitations"
							content="AI models analyze movement and behavior patterns from standardized action videos. These models provide confidence-based support, not final diagnosis. Output may include uncertainty and can be affected by video quality, lighting, posture visibility, and data variability."
						/>

						<Section
							icon={<Scale size={18} className="text-amber-600" />}
							title="3. Risks, Benefits, and Alternatives"
							content="Potential benefits include faster pattern detection and more consistent reporting. Risks include false positives/negatives and over-reliance on automated output. Alternative care remains available through clinician-led review without relying exclusively on AI predictions."
						/>

						<Section
							icon={<Lock size={18} className="text-teal-600" />}
							title="4. Consent Rights"
							content="Consent can be granted or revoked at any time. Revocation stops future AI-assisted processing and future recordings that require consent, while existing records are retained according to security, legal, and clinical governance requirements."
						/>

						<div className="border border-amber-200 bg-amber-50 p-4">
							<div className="flex items-start gap-3">
								<AlertTriangle size={18} className="text-amber-700 mt-0.5" />
								<div>
									<p className="text-xs font-bold uppercase tracking-wider text-amber-900">
										Important Notice
									</p>
									<p className="text-sm text-amber-900 mt-1">
										AI output is assistive and must be reviewed by qualified therapists.
										Clinical judgment remains the final authority.
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="min-h-0 lg:overflow-y-auto lg:overscroll-y-contain px-6 py-5 space-y-5">
						<div className="border border-zinc-200 p-4 bg-zinc-50">
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
								Current Consent Status
							</p>
							<div className="mt-2 flex items-center gap-2">
								<CheckCircle2
									size={16}
									className={isGranted ? "text-emerald-600" : "text-zinc-400"}
								/>
								<p className="text-sm font-bold uppercase tracking-wider text-zinc-900">
									{isGranted ? "Granted" : "Not Granted"}
								</p>
							</div>
						</div>

						<div className="border border-zinc-200 p-4">
							<h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
								Decision History
							</h4>
							{consentHistory.length === 0 ? (
								<p className="text-xs text-zinc-500">No consent actions recorded yet.</p>
							) : (
								<div className="space-y-2 max-h-40 overflow-y-auto pr-1">
									{consentHistory
										.slice()
										.reverse()
										.map((entry, index) => (
											<div
												key={`${entry.timestamp}-${index}`}
												className="border border-zinc-100 bg-zinc-50 px-3 py-2"
											>
												<p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
													{entry.decision}
												</p>
												<p className="text-xs text-zinc-500 mt-1">
													{formatTimestamp(entry.timestamp)}
												</p>
											</div>
										))}
								</div>
							)}
						</div>

						<div className="border border-zinc-200 p-4 bg-zinc-50">
							<p className="text-xs text-zinc-600">
								By granting consent, you confirm you understand how recordings and AI analysis
								are used in this platform.
							</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<button
								type="button"
								onClick={onGrant}
								className="px-4 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors"
							>
								Grant Consent
							</button>
							<button
								type="button"
								onClick={onRevoke}
								className="px-4 py-3 border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-wider hover:bg-zinc-100 transition-colors"
							>
								Revoke Consent
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="w-full px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function Section({
	icon,
	title,
	content,
}: {
	icon: React.ReactNode;
	title: string;
	content: string;
}) {
	return (
		<section className="border border-zinc-200 p-4">
			<div className="flex items-center gap-2">
				{icon}
				<h4 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
					{title}
				</h4>
			</div>
			<p className="mt-3 text-sm leading-relaxed text-zinc-700">{content}</p>
		</section>
	);
}
