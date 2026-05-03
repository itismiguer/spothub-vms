import React from 'react';
import { motion } from 'motion/react';
import { Star, MessageSquare, CheckCircle2, Plus } from 'lucide-react';
import { Review } from '../../types';
import { TableSkeleton } from '../../components/Skeletons';

interface FeedbackTabProps {
  reviews: Review[];
  loading: boolean;
  onReply: (id: string, text: string) => void;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({ reviews, loading, onReply }) => {
  if (loading) return <TableSkeleton />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 space-y-6 sm:space-y-8">
        <div className="glass p-5 sm:p-8 md:p-10 rounded-[32px] sm:rounded-[40px] border-white/5 space-y-6 min-h-fit h-auto">
            <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Rating <span className="text-white/40">Stats</span></h3>
            <div className="space-y-4">
               {[5,4,3,2,1].map(star => {
                 const count = reviews.filter(r => r.rating === star).length;
                 const perc = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                 return (
                   <div key={star} className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-400 w-4">{star}</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${perc}%` }} className="h-full bg-lime shadow-[0_0_10px_rgba(181,245,90,0.5)]" />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 w-6">{count}</span>
                   </div>
                 );
               })}
            </div>
         </div>
      </div>
      <div className="lg:col-span-3 space-y-6">
         {reviews.length > 0 ? reviews.map(review => (
           <div key={review.id} className="glass p-10 rounded-[48px] border-white/5 space-y-8 group transition-all hover:border-white/10">
              <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-lime/10 rounded-2xl flex items-center justify-center text-lime font-black italic shadow-inner">
                      {review.user_name[0]}
                    </div>
                    <div>
                       <h4 className="text-sm font-black uppercase tracking-widest text-white">{review.user_name}</h4>
                       <div className="flex gap-1 text-lime mt-1">
                          {[1,2,3,4,5].map(i => <Star key={i} size={10} fill={i <= review.rating ? "currentColor" : "none"} />)}
                       </div>
                    </div>
                 </div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                   {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Just now'}
                  </span>
               </div>
               <p className="text-slate-300 font-medium leading-relaxed italic text-lg text-pretty">"{review.comment}"</p>
                
               {review.owner_reply ? (
                 <div className="bg-white/5 border border-white/5 p-8 rounded-[32px] ml-6 relative mt-4">
                    <div className="absolute top-0 left-0 w-1 h-full bg-lime border-r border-charcoal" />
                    <h5 className="text-[10px] font-black text-lime uppercase tracking-widest mb-3 flex items-center gap-2">
                      Official Response <CheckCircle2 size={12} />
                    </h5>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">{review.owner_reply.text}</p>
                 </div>
               ) : (
                 <button 
                   onClick={() => {
                     // We'll pass the prompt logic to the parent or handle it here if we pass setPromptDialog
                     onReply(review.id, ""); // Placeholder for interaction
                   }}
                   className="ml-6 flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-lime transition-all mt-4"
                 >
                   <Plus size={14} /> Add Official Reply
                 </button>
               )}
            </div>
          )) : (
           <div className="py-32 text-center space-y-6 glass rounded-[48px] border-white/5">
              <div className="w-20 h-20 glass rounded-[32px] mx-auto flex items-center justify-center text-slate-700">
                 <MessageSquare size={32} />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs italic">No reviews yet. Encourage your players to speak.</p>
           </div>
         )}
      </div>
    </div>
  );
};
