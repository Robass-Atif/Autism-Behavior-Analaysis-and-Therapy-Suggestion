import React from 'react';
import { Sparkles, BookOpen, ChevronRight, ThumbsUp, ThumbsDown, Edit, ArrowRight } from 'lucide-react';

export default function TherapyRecommendations() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
           <div>
             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               <Sparkles className="text-purple-600" /> Therapy Recommendations
             </h1>
             <p className="text-gray-500 mt-1">AI-generated suggestions based on clinical evidence and patient history.</p>
           </div>
           <button className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg shadow-sm hover:bg-teal-700 flex items-center gap-2">
             <Sparkles size={16} /> Generate New
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
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full hidden lg:flex">
         <div className="p-4 border-b border-gray-200 bg-gray-50">
           <h3 className="font-bold text-gray-900 flex items-center gap-2">
             <BookOpen size={18} className="text-blue-600" /> Clinical Evidence
           </h3>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
  const getColors = () => {
    switch(priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-amber-500';
      default: return 'border-l-blue-500';
    }
  };

  const getBadge = () => {
     switch(priority) {
      case 'high': return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold uppercase">High Priority</span>;
      case 'medium': return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded font-bold uppercase">Medium Priority</span>;
      default: return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold uppercase">Low Priority</span>;
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${getColors()} p-6`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex gap-2 mb-2">{getBadge()}</div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold text-gray-900">{confidence}%</span>
          <span className="text-xs text-gray-400">Confidence</span>
        </div>
      </div>
      
      <p className="text-gray-700 mb-4 font-medium">{desc}</p>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">AI Reasoning & Evidence</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{reasoning}</p>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button className="flex-1 py-2 bg-green-50 text-green-700 font-bold rounded hover:bg-green-100 flex items-center justify-center gap-2 text-sm">
          <ThumbsUp size={16} /> Accept
        </button>
        <button className="flex-1 py-2 bg-red-50 text-red-700 font-bold rounded hover:bg-red-100 flex items-center justify-center gap-2 text-sm">
          <ThumbsDown size={16} /> Reject
        </button>
        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
          <Edit size={18} />
        </button>
      </div>
    </div>
  );
};

const SourceCard = ({ title, journal, relevance, type }: any) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
    <div className="flex justify-between items-start mb-1">
      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">{type}</span>
      <span className="text-xs font-bold text-green-600">{relevance}% Match</span>
    </div>
    <h4 className="text-sm font-semibold text-blue-700 mb-1 line-clamp-2">{title}</h4>
    <p className="text-xs text-gray-500">{journal}</p>
    <div className="mt-2 flex items-center text-xs text-blue-500 font-medium group">
      View Source <ArrowRight size={12} className="ml-1 transition-transform group-hover:translate-x-1" />
    </div>
  </div>
);