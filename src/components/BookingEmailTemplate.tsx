import React from 'react';
import { Mail, Calendar, MapPin, DollarSign, ExternalLink, QrCode as QrIcon, Clock } from 'lucide-react';

interface EmailTemplateProps {
  venueName: string;
  courtName: string;
  startTime: string;
  address: string;
  amount: number;
  currencyCode: string;
  bookingId: string;
}

export default function BookingEmailTemplate({
  venueName,
  courtName,
  startTime,
  address,
  amount,
  currencyCode,
  bookingId
}: EmailTemplateProps) {
  const addToCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=Booking at ${venueName}&details=Court: ${courtName}&location=${address}`;

  return (
    <div className="max-w-2xl mx-auto bg-white text-charcoal font-sans rounded-3xl overflow-hidden shadow-2xl">
      {/* Email Body */}
      <div className="p-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Receipt</p>
            <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter leading-none">{venueName}</h1>
          </div>
          <div className="w-16 h-16 bg-lime flex items-center justify-center rounded-2xl">
            <Mail className="text-charcoal" size={24} />
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-lg font-medium leading-relaxed">
            Success! Your payment has been verified. Your reservation for <span className="font-black italic uppercase">{courtName}</span> is now active.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-lime-600">
                <Calendar size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Schedule</span>
              </div>
              <p className="text-sm font-black uppercase italic">{startTime}</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-lime-600">
                <DollarSign size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Total Paid</span>
              </div>
              <p className="text-xl font-display font-black uppercase italic">
                {currencyCode === 'PHP' ? '₱' : currencyCode === 'USD' ? '$' : currencyCode} {amount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl flex items-start gap-4">
            <MapPin className="text-slate-400 flex-shrink-0" size={20} />
            <div className="space-y-1 text-xs">
              <p className="font-black uppercase tracking-widest text-slate-400">Venue Address</p>
              <p className="font-bold">{address}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-100">
          <a 
            href={`/my-bookings/${bookingId}`}
            className="w-full h-16 bg-lime text-charcoal rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
             <QrIcon size={18} />
             View Digital Ticket
          </a>
          <a 
            href={addToCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-16 bg-charcoal text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all"
          >
             <Calendar size={18} className="text-lime" />
             Add to Calendar
          </a>
        </div>
      </div>

      <div className="p-8 bg-slate-50 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Internal Ref: #{bookingId.slice(0, 8)}</p>
        <p className="text-[9px] font-medium text-slate-400 leading-relaxed max-w-sm mx-auto">
          This is an automated system receipt. Please do not reply to this email. For support, contact {venueName} directly.
        </p>
      </div>
    </div>
  );
}
