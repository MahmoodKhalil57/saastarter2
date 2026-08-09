// The self-registering entry for <s2-counter-jit> (contract rule 1) —
// importing THIS file defines the tag; the factory and the React engine
// load only when an instance actually connects.
import { defineReactComponent } from "react-jit/define.js";

defineReactComponent("s2-counter-jit", () => import("./counter.js"));
