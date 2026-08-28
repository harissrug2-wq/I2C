import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useData } from '../context/DataContext';
export default function AlertBanner({onOpenActionModal}){
 const {sys4}=useData(); const top=sys4.collectionQueue.find(c=>c.pastDue>0)||sys4.collectionQueue[0]; if(!top)return null;
 return <div onClick={()=>onOpenActionModal({title:'Money At Risk Alert',type:'at-risk-detail',amount:`$${sys4.moneyAtRisk.toLocaleString()} at risk`,details:`${top.name} is the highest current collection priority.`})} className="mt-4 flex items-start gap-3 rounded-xl bg-[#d97706]/10 p-4 ring-1 ring-[#d97706]/30 ring-inset hover:bg-[#d97706]/20 cursor-pointer"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#d97706]"/><span className="text-sm font-medium">${sys4.moneyAtRisk.toLocaleString()} is currently classified as money at risk. <strong className="text-[#d97706]">{top.name}</strong> is the highest collection priority with ${top.pastDue.toLocaleString()} past due.</span></div>;
}
