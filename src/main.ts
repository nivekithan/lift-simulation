import "./preflight.css";
import "./form.css";
import "./simulation.css";
import { LiftSimulation } from "./liftsimulation";

const url = new URL(window.location.href);

if (url.searchParams.has("floors") && url.searchParams.has("lifts")) {
  const isFormContainerPresent = document.getElementById("form-container");

  if (isFormContainerPresent) {
    const formContainer = isFormContainerPresent;
    formContainer.innerHTML = "";
    formContainer.id = "floor-container";
  }

  const numberOfFloors = parseInt(url.searchParams.get("floors") || "");
  const numberOfLifts = parseInt(url.searchParams.get("lifts") || "");

  if (numberOfFloors <= 0 || numberOfLifts <= 0) {
    url.searchParams.delete("floors");
    url.searchParams.delete("lifts");
    window.location.href = url.toString();
  }

  const simulator = new LiftSimulation(numberOfFloors, numberOfLifts);
  const floorContainer = document.getElementById("floor-container");
  if (!floorContainer) {
    throw new Error("There is no element with id floor-container");
  }
  simulator.render(floorContainer);
}
