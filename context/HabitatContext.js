import React, { createContext, useContext, useState } from "react";

/** @typedef {import('../types/habitat').Habitat} Habitat */
/** @typedef {import('../types/habitat').Sensor} Sensor */

const HabitatContext = createContext();

const defaultHabitat = [
  {
    id: "1",
    name: "hb_01",
    connection: "001",
    rows: 5,
    cols: 5,
    sensors: [{ row: 0, col: 0, number: 1 }],
  },
];

export const HabitatProvider = ({ children }) => {
  /** @type {Habitat[]} */
  const [habitats, setHabitats] = useState(defaultHabitat);

  //adding our data to our current habitat
  const addHabitat = ({ name, connection, rows, cols, sensors = [] }) => {
    /** @type {Habitat} */
    const newHabitat = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: name.trim(),
      connection: connection.trim(),
      rows: Number(rows),
      cols: Number(cols),
      sensors,
    };
    //return habitat back to the context list
    setHabitats((prev) => [...prev, newHabitat]);
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
