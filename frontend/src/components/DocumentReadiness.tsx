// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CircleAlert, FileCheck2 } from "lucide-react";
import { applicationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function DocumentReadiness({applicationId}:{applicationId:string}){
 const qc=useQueryClient();const readiness=useQuery({queryKey:["document-readiness",applicationId],queryFn:()=>applicationsApi.readiness(applicationId)});const documents=useQuery({queryKey:["portal-documents"],queryFn:applicationsApi.documents});const [selected,setSelected]=useState<string[]>([]);const [message,setMessage]=useState("");
 if(readiness.isLoading)return <p className="text-xs text-slate-500">Checking opportunity document requirements…</p>;
 if(readiness.isError)return <p role="alert" className="text-xs text-rose-700">Could not check document requirements. Try again.</p>;
 const data=readiness.data!;
 return <details className="rounded-xl border border-slate-200 bg-slate-50"><summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold">Document readiness · {data.ready?"Ready":"Requirements to review"}</summary><div className="space-y-2 border-t bg-white p-3">{data.checklist.length===0?<p className="text-xs text-slate-500">The provider has not published structured document rules in HDOS. Confirm requirements on the official opportunity page.</p>:data.checklist.map(item=><div key={item.requirementId} className="flex items-start gap-2 text-xs"><span className={`mt-0.5 ${item.available?"text-emerald-700":"text-amber-700"}`}>{item.available?<Check size={14}/>:<CircleAlert size={14}/>}</span><div className="flex-1"><p className="font-medium">{item.label}{item.mandatory?" · Required":" · Optional"}</p><p className="text-slate-500">{item.status.replaceAll("_"," ")}{item.needsConfirmation?" · Applicant confirmation needed":""}</p></div>{item.documentId&&item.available&&<label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={selected.includes(item.documentId)} onChange={e=>setSelected(e.target.checked?[...selected,item.documentId!]:selected.filter(id=>id!==item.documentId))}/>Attach</label>}</div>)}{message&&<p role="status" className="text-xs text-blue-800">{message}</p>}{selected.length>0&&<Button size="sm" className="rounded-lg" onClick={async()=>{try{await applicationsApi.attachDocuments(applicationId,selected);setMessage("Selected document versions attached to this application.");setSelected([]);await qc.invalidateQueries({queryKey:["applications"]})}catch(e){setMessage(e instanceof Error?e.message:"Could not attach documents")}}}><FileCheck2 size={14} className="mr-1"/>Attach selected documents</Button>}<p className="text-[10px] text-slate-500">A file marked uploaded is not necessarily institutionally verified.</p></div></details>
}
