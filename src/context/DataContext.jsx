import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  DEFAULT_THRESHOLDS,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_PRODUCTS,
  INITIAL_BILLS,
  INITIAL_VENDORS,
  INITIAL_CASH_BALANCE,
  TRAILING_90D_REVENUE,
  TRAILING_90D_COGS,
  TRAILING_90D_PURCHASES,
  computeSystem1,
  computeSystem2,
  computeSystem3,
  computeSystem4,
  computeSystem5,
  evaluateRules
} from '../utils/decisionSystems';

const DataContext = createContext();

const STORAGE_KEY_USER = 'i2cashflow_user_session';
const STORAGE_KEY_THRESHOLDS = 'i2cashflow_thresholds';
const STORAGE_KEY_CASH = 'i2cashflow_cash_balance';

export function DataProvider({ children }) {
  // Authentication & Workspace User State
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : {
        email: 'dana@harbourline.com',
        name: 'Dana Mercer',
        company: 'Harbourline Distribution',
        role: 'Finance Director',
        isAuthenticated: false
      };
    } catch {
      return {
        email: 'dana@harbourline.com',
        name: 'Dana Mercer',
        company: 'Harbourline Distribution',
        role: 'Finance Director',
        isAuthenticated: false
      };
    }
  });

  // Raw Data State
  const [cashBalance, setCashBalance] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CASH);
      return saved ? Number(saved) : INITIAL_CASH_BALANCE;
    } catch {
      return INITIAL_CASH_BALANCE;
    }
  });

  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [revenue90d, setRevenue90d] = useState(TRAILING_90D_REVENUE);
  const [cogs90d, setCogs90d] = useState(TRAILING_90D_COGS);
  const [purchases90d, setPurchases90d] = useState(TRAILING_90D_PURCHASES);

  // Configurable Workspace Overrides / Thresholds State
  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THRESHOLDS);
      return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
    } catch {
      return DEFAULT_THRESHOLDS;
    }
  });

  // Save changes to localStorage for persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THRESHOLDS, JSON.stringify(thresholds));
    } catch (e) {
      console.error(e);
    }
  }, [thresholds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CASH, cashBalance.toString());
    } catch (e) {
      console.error(e);
    }
  }, [cashBalance]);

  // Re-compute all 5 Decision Systems dynamically on any data or threshold change
  const computedData = useMemo(() => {
    const sys1 = computeSystem1(cashBalance, invoices, products, bills, revenue90d, cogs90d, purchases90d, thresholds);
    const sys2 = computeSystem2(products, customers, thresholds);
    const sys3 = computeSystem3(cashBalance, invoices, bills, thresholds);
    const sys4 = computeSystem4(customers, invoices, bills, vendors, thresholds);
    const sys5 = computeSystem5(products, customers, vendors, thresholds);
    const advisories = evaluateRules(sys1, sys2, sys3, sys4, sys5, thresholds);

    return {
      sys1,
      sys2,
      sys3,
      sys4,
      sys5,
      advisories
    };
  }, [cashBalance, customers, invoices, products, bills, vendors, revenue90d, cogs90d, purchases90d, thresholds]);

  // Auth Functions
  const loginUser = (emailInput, nameInput, companyInput) => {
    const newUser = {
      email: emailInput || 'dana@harbourline.com',
      name: nameInput || (emailInput ? emailInput.split('@')[0] : 'Dana Mercer'),
      company: companyInput || 'Harbourline Distribution',
      role: 'Finance Director',
      isAuthenticated: true
    };
    setUser(newUser);
    return newUser;
  };

  const logoutUser = () => {
    setUser(prev => ({ ...prev, isAuthenticated: false }));
  };

  // Helper functions to update state dynamically
  const updateThreshold = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: Number(value) }));
  };

  const resetThresholds = () => {
    setThresholds(DEFAULT_THRESHOLDS);
  };

  const updateCustomerRisk = (customerId, newRiskScore) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, riskScore: newRiskScore } : c));
    setInvoices(prev => prev.map(inv => inv.customerId === customerId ? { ...inv, riskScore: newRiskScore } : inv));
  };

  const updateCashBalance = (newCash) => {
    setCashBalance(Number(newCash));
  };

  const addCustomer = (newCustomer) => {
    setCustomers(prev => [newCustomer, ...prev]);
  };

  const addInvoice = (newInvoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
  };

  const addProduct = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const value = {
    // User Auth
    user,
    loginUser,
    logoutUser,
    // Raw state
    cashBalance,
    customers,
    invoices,
    products,
    bills,
    vendors,
    thresholds,
    // Dynamic Decision System Outputs
    ...computedData,
    // Actions
    updateThreshold,
    resetThresholds,
    updateCustomerRisk,
    updateCashBalance,
    addCustomer,
    addInvoice,
    addProduct,
    setCustomers,
    setInvoices,
    setProducts,
    setBills
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
