export type Sensor = {
  row: number;
  col: number;
  number: number;
};

export type Habitat = {
  id?: string;
  name: string;
  connection: string;
  rows: number;
  cols: number;
  sensors: Sensor[];
};
