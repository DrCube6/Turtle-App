// contexts/HabitatContext.js
import React, { createContext, useContext, useState } from "react";

//creation of the context
const HabitatContext = createContext();

//default habitats
const defaultHabitats = [];

export const HabitatProvider = ({ children }) => {
  const [habitats, setHabitats] = useState(defaultHabitats);

  const addHabitat = (name, connection) => {
    setHabitats((prev) => [
      ...prev,
      { id: Date.now().toString(), name, connection },
    ]);
  };

  const updateHabitat = (id, updatedData) => {
    setHabitats((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updatedData } : h)),
    );
  };

  return (
    <HabitatContext.Provider value={{ habitats, addHabitat, updateHabitat }}>
      {children}
    </HabitatContext.Provider>
  );
};

export const useHabitats = () => useContext(HabitatContext);
