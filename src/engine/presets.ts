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

const PROMISE_VS_TIMEOUT: Preset = {
  id: "promise-vs-timeout",
  label: "Promise vs setTimeout",
  source: `console.log("start");
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("end");
`,
};

const MULTIPLE_MICROTASKS: Preset = {
  id: "multiple-microtasks",
  label: "Multiple microtasks",
  source: `Promise.resolve().then(() => console.log("promise 1"));
Promise.resolve().then(() => console.log("promise 2"));
setTimeout(() => console.log("timeout"), 0);
`,
};

const PROMISE_CHAINING: Preset = {
  id: "promise-chaining",
  label: "Promise chaining",
  source: `Promise.resolve()
  .then(() => console.log("first"))
  .then(() => console.log("second"))
  .then(() => console.log("third"));
`,
};

const ASYNC_AWAIT: Preset = {
  id: "async-await",
  label: "async / await",
  source: `async function fetchData() {
  console.log("fetching");
  const result = await Promise.resolve("data");
  console.log(result);
}
console.log("before");
fetchData();
console.log("after");
`,
};

export const PRESETS: Preset[] = [
  SYNCHRONOUS_ORDER,
  SET_TIMEOUT_ZERO,
  PROMISE_VS_TIMEOUT,
  MULTIPLE_MICROTASKS,
  PROMISE_CHAINING,
  ASYNC_AWAIT,
];

export const DEFAULT_PRESET = ASYNC_AWAIT;
