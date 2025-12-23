// File: store/index.js
import { createStore, combineReducers } from 'redux';
import { createWrapper } from 'next-redux-wrapper';

// Counter reducer (example, replace with your own reducer)
const counterReducer = (state = { count: 0 }, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    default:
      return state;
  }
};

// Combine reducers (add more reducers here as needed)
const rootReducer = combineReducers({
  counter: counterReducer,
});

// Create store
const makeStore = () => createStore(rootReducer);

export const wrapper = createWrapper(makeStore);
