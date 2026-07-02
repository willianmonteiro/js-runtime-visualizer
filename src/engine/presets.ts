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

const SET_TIMEOUT_ZERO: Preset = {
  id: "set-timeout-zero",
  label: "setTimeout(0)",
  source: `console.log("start");
setTimeout(() => console.log("timeout"), 0);
console.log("end");
`,
};

export const PRESETS: Preset[] = [SYNCHRONOUS_ORDER, SET_TIMEOUT_ZERO];

export const DEFAULT_PRESET = SET_TIMEOUT_ZERO;
