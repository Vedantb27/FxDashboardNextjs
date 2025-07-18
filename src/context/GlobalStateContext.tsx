"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Define the shape of a TradeHistory item
interface TradeHistory {
  sr_no: number;
  position_id: number;
  open_date: string;
  close_date: string;
  profit: number;
}

// Define the shape of the state
interface GlobalState {
  count: number;
  tradeHistory: { [accountNumber: string]: TradeHistory[] };
}

// Define action types
type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' }
  | { type: 'SET_TRADE_HISTORY'; payload: { accountNumber: string; trades: TradeHistory[] } };

// Initial state
const initialState: GlobalState = {
  count: 0,
  tradeHistory: {},
};

// Reducer function
const globalReducer = (state: GlobalState, action: Action): GlobalState => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'RESET':
      return { ...state, count: 0 };
    case 'SET_TRADE_HISTORY':
      return {
        ...state,
        tradeHistory: {
          ...state.tradeHistory,
          [action.payload.accountNumber]: action.payload.trades,
        },
      };
    default:
      return state;
  }
};

// Create context
interface GlobalStateContextType {
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

// Context provider component
export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

// Custom hook to use the context
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};