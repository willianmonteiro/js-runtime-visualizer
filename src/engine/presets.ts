export interface Preset {
  id: string;
  label: string;
  source: string;
}

const SYNCHRONOUS_ORDER: Preset = {
  id: "synchronous-order",
  label: "Synchronous order",
  source: `console.log("start");
console.log("middle");
console.log("end");
`,
};

export const PRESETS: Preset[] = [SYNCHRONOUS_ORDER];

export const DEFAULT_PRESET = SYNCHRONOUS_ORDER;
