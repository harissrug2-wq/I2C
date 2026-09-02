import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createEmptyWorkspaceData } from '../data/emptyWorkspace';
import { buildEngineInputs } from '../domain/dataAdapters';
import { DEFAULT_THRESHOLDS, computeSystem1, computeSystem2, computeSystem3, computeSystem4, computeSystem5, evaluateRules } from '../utils/decisionSystems';
import { evaluateReceivablesRules } from '../domain/receivables';
import { computePayablesModule, evaluatePayablesRules } from '../domain/payables';

const DataContext = createContext();
const K_USER='i2cashflow_user_session_v2';
const K_THRESH='i2cashflow_thresholds';
const K_WORKSPACE='i2cashflow_workspace_v3';

const defaultUser={email:'',name:'',company:'',role:'Finance Director',isAuthenticated:false};
const safeParse=(key,fallback)=>{ try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch { return fallback; } };

function initialWorkspace() {
  return safeParse(K_WORKSPACE, createEmptyWorkspaceData());
}

function initialUser() {
  return safeParse(K_USER, defaultUser);
}

export function DataProvider({children}) {
  const [user,setUser]=useState(initialUser);
  const [thresholds,setThresholds]=useState(()=>safeParse(K_THRESH,DEFAULT_THRESHOLDS));
  const [workspaceData,setWorkspaceData]=useState(initialWorkspace);

  useEffect(()=>{ try{localStorage.setItem(K_USER,JSON.stringify(user));}catch{} },[user]);
  useEffect(()=>{ try{localStorage.setItem(K_THRESH,JSON.stringify(thresholds));}catch{} },[thresholds]);
  useEffect(()=>{ try{localStorage.setItem(K_WORKSPACE,JSON.stringify(workspaceData));}catch{} },[workspaceData]);

  const engine=useMemo(()=>buildEngineInputs(workspaceData),[workspaceData]);
  const computedData=useMemo(()=>{
    const sys1=computeSystem1(engine.cashBalance,engine.invoices,engine.products,engine.bills,engine.metrics,thresholds);
    const sys2=computeSystem2(engine.products,thresholds);
    const sys4Base=computeSystem4(engine.customers,engine.invoices,engine.bills,engine.vendors,thresholds);
    const payScoreByCustomer=new Map(sys4Base.collectionQueue.map(c=>[c.id,c.payScore]));
    const cashInvoices=engine.invoices.map(i=>({...i,riskScore:payScoreByCustomer.get(i.customerId)??i.riskScore}));
    const sys3=computeSystem3(engine.cashBalance,cashInvoices,engine.bills,engine.metrics,engine.asOfDate,thresholds);
    const payables=computePayablesModule(engine.bills,engine.vendors,engine.cashBalance,thresholds);
    const sys4={
      ...sys4Base,
      payables,
      bills:payables.bills,
      vendors:payables.suppliers,
      discountOpportunities:payables.discountOpportunities.map(d=>({...d,savings:d.discountSavings,isProfitableToTake:d.aprQualified})),
      totalDiscountSavings:payables.totalDiscountSavings,
    };
    const sys5=computeSystem5(engine.products,engine.customers,engine.vendors,thresholds);
    const phase1Advisories=evaluateRules(sys1,sys2,sys3,sys4,sys5,thresholds);
    const receivablesAdvisories=evaluateReceivablesRules(sys4.receivables || sys4);
    const payablesAdvisories=evaluatePayablesRules(payables,sys3,thresholds,{includeAP002:false,includeAP003:false,includeAP004:false});
    return {sys1,sys2,sys3,sys4,sys5,advisories:[...phase1Advisories,...receivablesAdvisories,...payablesAdvisories]};
  },[engine,thresholds]);

  const updateThreshold=(key,value)=>setThresholds(p=>({...p,[key]:Number(value)}));
  const resetThresholds=()=>setThresholds(DEFAULT_THRESHOLDS);
  const loginUser=(emailInput,nameInput,companyInput)=>{
    const email=String(emailInput||'').trim();
    const u={
      email,
      name:String(nameInput||'').trim() || (email ? email.split('@')[0] : 'User'),
      company:String(companyInput||'').trim(),
      role:'Finance Director',
      isAuthenticated:true,
    };
    setUser(u);
    return u;
  };
  const logoutUser=()=>setUser(p=>({...p,isAuthenticated:false}));

  const updateDataset=(key,next)=>setWorkspaceData(prev=>({...prev,[key]:typeof next==='function'?next(prev[key]):next}));
  const updateCompanyMetrics=(patch)=>setWorkspaceData(prev=>({...prev,companyMetrics:{...prev.companyMetrics,...patch}}));
  const updateCashBalance=(value)=>setWorkspaceData(prev=>{
    const accounts=[...(prev.bankAccounts||[])];
    if(!accounts.length) accounts.push({account_id:'BANK-001',account_code:'1000',name:'Operating Account',type:'checking',institution:'Manual',balance:Number(value)});
    else {
      const total=accounts.reduce((s,a)=>s+Number(a.balance||0),0);
      const diff=Number(value)-total;
      accounts[0]={...accounts[0],balance:Number(accounts[0].balance||0)+diff};
    }
    return {...prev,bankAccounts:accounts};
  });
  const resetWorkspace=()=>setWorkspaceData(createEmptyWorkspaceData());
  const replaceWorkspace=(data)=>setWorkspaceData(data);
  const hasWorkspaceData=Boolean(
    workspaceData.customers?.length || workspaceData.suppliers?.length || workspaceData.invoices?.length ||
    workspaceData.bills?.length || workspaceData.products?.length || workspaceData.bankAccounts?.length ||
    workspaceData.paymentsReceived?.length || workspaceData.paymentsMade?.length
  );

  const value={
    user,loginUser,logoutUser,thresholds,updateThreshold,resetThresholds,
    workspaceData,updateDataset,updateCompanyMetrics,resetWorkspace,replaceWorkspace,hasWorkspaceData,
    cashBalance:engine.cashBalance,customers:engine.customers,invoices:engine.invoices,products:engine.products,bills:engine.bills,vendors:engine.vendors,metrics:engine.metrics,asOfDate:engine.asOfDate,
    updateCashBalance,
    ...computedData,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(){const c=useContext(DataContext); if(!c) throw new Error('useData must be used within DataProvider'); return c;}
