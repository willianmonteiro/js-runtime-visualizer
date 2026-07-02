import { ZONES } from "../zones";
import Zone from "./Zone";
import EventLoopIndicator from "./EventLoopIndicator";

export default function VisualizationPanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_1fr] gap-3 lg:grid-cols-2">
        <Zone meta={ZONES.callStack} />
        <Zone meta={ZONES.webApis} />
        <Zone meta={ZONES.microtaskQueue} />
        <Zone meta={ZONES.callbackQueue} />
      </div>
      <EventLoopIndicator />
    </div>
  );
}
