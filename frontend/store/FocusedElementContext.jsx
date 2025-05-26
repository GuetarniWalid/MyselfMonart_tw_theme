import { createContext, useRef, useContext } from 'react';

const FocusedElementContext = createContext(null);

export const FocusedElementProvider = ({ children }) => {
  const focusedElement = useRef(null);

  return (
    <FocusedElementContext.Provider value={focusedElement}>
      {children}
    </FocusedElementContext.Provider>
  );
};

export const useFocusedElementRef = () => useContext(FocusedElementContext); 