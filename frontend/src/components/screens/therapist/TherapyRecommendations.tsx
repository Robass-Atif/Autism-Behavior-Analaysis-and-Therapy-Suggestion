import React from 'react';
import { Sparkles, BookOpen, ThumbsUp, ThumbsDown, Edit, ArrowRight, Brain, FileText, CheckCircle2 } from 'lucide-react';

export default function TherapyRecommendations() {
  return (
    <div className="flex h-full overflow-hidden font-mono bg-white">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8 border-b-2 border-zinc-900 pb-6">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tighter">
              <Brain className="text-zinc-900" strokeWidth={2.5} />
              <span>Therapy Recommendations</span>
            </h1>
            <p className="text-zinc-500 mt-2 text-xs font-bold uppercase tracking-widest">
              AI-GENERATED CLINICAL INSIGHTS // EVIDENCE-BASED PROTOCOLS
            </p>
          </div>
          <button className="px-6 py-3 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 flex items-center gap-2 transition-all ring-1 ring-zinc-900 ring-offset-2">
            <Sparkles size={14} /> Generate Analysis
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RecommendationCard
            priority="high"
            title="Proprioceptive Input Strategy"
            confidence={92}
            desc="Implement heavy work activities prior to fine motor tasks to improve stability and focus."
            reasoning="Analysis of recent video sessions shows increased motor agitation (tremors) preceding failed fine motor attempts. Clinical literature suggests proprioceptive input can regulate arousal levels in these contexts."
          />
          <RecommendationCard
            priority="medium"
            title="Visual Schedule Integration"
            confidence={85}
            desc="Introduce a pictographic schedule for transition periods to reduce anxiety."
            reasoning="Transition latency has increased by 15% this month. Visual supports are a gold-standard intervention for reducing transition-related anxiety in ASD Level 2."
          />
          <RecommendationCard
            priority="low"
            title="Peer Modeling Protocol"
            confidence={78}
            desc="Use video modeling of peers performing social greetings."
            reasoning="Social engagement scores are plateauing. Peer modeling has shown efficacy in breaking plateaus for social imitation skills."
          />
        </div>
      </div>

      {/* RAG Sidebar */}
      <div className="w-96 bg-zinc-50 border-l-2 border-zinc-200 flex flex-col h-full hidden lg:flex">
        <div className="p-6 border-b-2 border-zinc-200 bg-zinc-100/50">
          <h3 className="font-black text-zinc-900 flex items-center gap-2 uppercase tracking-wider text-sm">
            <BookOpen size={16} className="text-zinc-700" /> Clinical Evidence
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <SourceCard
            title="Sensory Integration and Motor Control in ASD"
            journal="Journal of Autism & Dev. Disorders (2022)"
            relevance={98}
            type="Systematic Review"
          />
          <SourceCard
            title="Efficacy of Heavy Work Protocols"
            journal="Am. Journal of Occ. Therapy (2021)"
            relevance={94}
            type="RCT"
          />
          <SourceCard
            title="Visual Supports for Transitions"
            journal="Clinical Child Psychology (2023)"
            relevance={88}
            type="Meta-Analysis"
          />
        </div>
      </div>
    </div>
  );
}

const RecommendationCard = ({ priority, title, confidence, desc, reasoning }: any) => {
  const getBorderColor = () => {
    switch (priority) {
      case 'high': return 'border-l-zinc-900';
      case 'medium': return 'border-l-zinc-500';
      default: return 'border-l-zinc-300';
    }
  };

  const getPriorityLabel = () => {
    switch (priority) {
      case 'high': return <span className="bg-zinc-900 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-widest">High Priority</span>;
      case 'medium': return <span className="bg-zinc-200 text-zinc-800 text-[10px] px-2 py-1 font-bold uppercase tracking-widest">Medium Priority</span>;
      default: return <span className="border border-zinc-200 text-zinc-500 text-[10px] px-2 py-1 font-bold uppercase tracking-widest">Low Priority</span>;
    }
  }

  return (
    <div className={`bg-white border-2 border-zinc-200 border-l-8 ${getBorderColor()} p-6 hover:border-zinc-900 transition-colors group h-full flex flex-col`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex gap-2 mb-3">{getPriorityLabel()}</div>
          <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight leading-tight">{title}</h3>
        </div>
        <div className="flex flex-col items-end border-2 border-zinc-100 px-3 py-2 bg-zinc-50">
          <span className="text-2xl font-black text-zinc-900 tracking-tighter">{confidence}%</span>
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Confidence</span>
        </div>
      </div>

      <p className="text-zinc-700 mb-6 font-medium text-sm leading-relaxed border-l-2 border-zinc-100 pl-4">{desc}</p>

      <div className="bg-zinc-50 border border-zinc-200 p-4 mb-6 flex-1">
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <FileText size={12} /> AI Reasoning
        </h4>
        <p className="text-xs text-zinc-600 leading-relaxed font-mono">{reasoning}</p>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t-2 border-zinc-100 mt-auto">
        <button className="flex-1 py-2.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 flex items-center justify-center gap-2 transition-colors">
          <ThumbsUp size={14} /> Accept
        </button>
        <button className="flex-1 py-2.5 border-2 border-zinc-200 text-zinc-500 font-bold text-xs uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 flex items-center justify-center gap-2 transition-all">
          <ThumbsDown size={14} /> Reject
        </button>
        <button className="p-2.5 border-2 border-transparent hover:border-zinc-200 text-zinc-400 hover:text-zinc-900 transition-all">
          <Edit size={16} />
        </button>
      </div>
    </div>
  );
};

const SourceCard = ({ title, journal, relevance, type }: any) => (
  <div className="bg-white border-2 border-transparent hover:border-zinc-900 p-4 transition-all cursor-pointer group hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-b-zinc-200 last:border-b-0">
    <div className="flex justify-between items-start mb-2">
      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">{type}</span>
      <span className="text-[10px] font-bold text-zinc-900 bg-zinc-200 px-1.5 py-0.5">{relevance}% MATCH</span>
    </div>
    <h4 className="text-xs font-bold text-zinc-900 mb-1 leading-snug group-hover:text-zinc-900 uppercase">{title}</h4>
    <p className="text-[10px] text-zinc-500 font-medium">{journal}</p>
    <div className="mt-3 flex items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest group-hover:text-zinc-900">
      View Source <ArrowRight size={12} className="ml-1 transition-transform group-hover:translate-x-1" />
    </div>
  </div>
);
