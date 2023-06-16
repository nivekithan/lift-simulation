import "./style.css";
import "./preflight.css";
import "./style.css";
import { LiftSimulation } from "./liftsimulation";

const simulator = new LiftSimulation(10, 3);

const floorContainer = document.getElementById("floor-container");

if (!floorContainer) {
  throw new Error("There is no element with id floor-container");
}

simulator.render(floorContainer);
