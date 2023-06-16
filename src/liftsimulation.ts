export class LiftSimulation {
  #isRenderCalled = false;

  #noOfFloors: number;
  #noOfLifts: number;

  #liftStops: Map<
    number,
    { stops: Set<number>; currentDirection: "up" | "down" | "idle" }
  >;

  #liftAnimationState: Map<number, boolean>;

  constructor(noOfFloors: number, noOfLifts: number) {
    this.#noOfFloors = noOfFloors;
    this.#noOfLifts = noOfLifts;
    this.#liftStops = new Map();
    this.#liftAnimationState = new Map();

    for (let i = 0; i <= noOfLifts; i++) {
      this.#liftStops.set(i, { stops: new Set(), currentDirection: "idle" });
      this.#liftAnimationState.set(i, false);
    }
  }

  #registerEventListeners() {
    for (let i = 1; i <= this.#noOfFloors; i++) {
      document
        .getElementById(`up-${i}`)
        ?.addEventListener("click", async () => {
          const isAlreadyPartOfStop = this.#isFloorAlreadyPartOfStop(i);

          if (isAlreadyPartOfStop) {
            return;
          }

          const liftNo = this.#nearestLiftToFloor(i).liftNo;
          this.#liftStops.get(liftNo)!.stops.add(i);
          await this.#startLift(liftNo);
        });

      document
        .getElementById(`down-${i}`)
        ?.addEventListener("click", async () => {
          const isAlreadyPartOfStop = this.#isFloorAlreadyPartOfStop(i);

          if (isAlreadyPartOfStop) {
            return;
          }

          const liftNo = this.#nearestLiftToFloor(i).liftNo;
          this.#liftStops.get(liftNo)!.stops.add(i);
          await this.#startLift(liftNo);
        });
    }
  }

  #nearestLiftToFloor(floorNo: number) {
    let nearestLift: null | {
      currentFloorNo: number;
      direction: "up" | "down" | "idle";
      liftNo: number;
    } = null;

    for (let i = 1; i <= this.#noOfLifts; i++) {
      const liftStop = this.#liftStops.get(i)!;

      const liftCurrentFloor = this.#getCurrentFloorNo(i);
      const liftDirection = liftStop.currentDirection;

      if (nearestLift === null) {
        nearestLift = {
          currentFloorNo: liftCurrentFloor,
          direction: liftDirection,
          liftNo: i,
        };
        continue;
      }

      const distanceDifference =
        Math.abs(nearestLift.currentFloorNo - floorNo) -
        Math.abs(floorNo - liftCurrentFloor);

      const isDistanceDifferenceEqual = distanceDifference === 0;

      // It means distance between current lift and target floor is lower than lift from nearestLift variable
      const isDistanceDifferencePositive = distanceDifference > 0;

      if (isDistanceDifferencePositive) {
        nearestLift = {
          currentFloorNo: liftCurrentFloor,
          direction: liftDirection,
          liftNo: i,
        };
        continue;
      }

      if (isDistanceDifferenceEqual) {
        // In this case if one of the lift has direction "idle" then it will take priority

        if (nearestLift.direction !== "idle" && liftDirection === "idle") {
          nearestLift = {
            currentFloorNo: liftCurrentFloor,
            direction: liftDirection,
            liftNo: i,
          };
        }
        continue;
      }
    }
    if (nearestLift === null) {
      throw new Error("Unreachable");
    }

    return nearestLift;
  }

  #isFloorAlreadyPartOfStop(floorNo: number) {
    for (let i = 1; i <= this.#noOfLifts; i++) {
      const liftStop = this.#liftStops.get(i)!;

      if (liftStop.stops.has(floorNo)) {
        return true;
      }
    }

    return false;
  }

  async #startLift(liftNo: number) {
    const isAnimating = this.#liftAnimationState.get(liftNo);

    if (isAnimating) {
      return;
    }

    const currentBottomValue = this.#getCurrentBottomValue(liftNo);
    const currnetFloorNo = this.#getCurrentFloorNo(liftNo);

    if (Number.isNaN(currnetFloorNo)) {
      throw new Error(`Invalid bottomValue ${currentBottomValue}`);
    }

    const liftStop = this.#liftStops.get(liftNo)!;

    if (liftStop.stops.has(currnetFloorNo)) {
      // Do the opening door animation here
      await new Promise((r) => setTimeout(r, 2000));
    }

    liftStop.stops.delete(currnetFloorNo);

    if (liftStop.stops.size === 0) {
      liftStop.currentDirection = "idle";
      return;
    }

    if (liftStop.currentDirection === "up") {
      let shouldGoUp = false;

      liftStop.stops.forEach((floorNo) => {
        if (floorNo > currnetFloorNo) {
          shouldGoUp = true;
        }
      });

      if (shouldGoUp) {
        this.#setLiftToFloor(liftNo, currnetFloorNo + 1);
        return;
      }

      this.#setLiftToFloor(liftNo, currnetFloorNo - 1);
      liftStop.currentDirection = "down";
      return;
    }

    if (liftStop.currentDirection === "down") {
      let shouldGoDown = false;

      liftStop.stops.forEach((floorNo) => {
        if (floorNo < currnetFloorNo) {
          shouldGoDown = true;
        }
      });

      if (shouldGoDown) {
        this.#setLiftToFloor(liftNo, currnetFloorNo - 1);
        return;
      }

      this.#setLiftToFloor(liftNo, currnetFloorNo + 1);
      liftStop.currentDirection = "up";
      return;
    }

    if (liftStop.currentDirection === "idle") {
      let nearestStop: null | number = null;

      liftStop.stops.forEach((floorNo) => {
        if (nearestStop === null) {
          nearestStop = floorNo;
        } else if (
          Math.abs(nearestStop - currnetFloorNo) >
          Math.abs(floorNo - currnetFloorNo)
        ) {
          nearestStop = floorNo;
        }
      });

      if (nearestStop === null) throw new Error(`There no elements in set`);

      const directionToGo = nearestStop > currnetFloorNo ? "up" : "down";

      if (directionToGo === "up") {
        this.#setLiftToFloor(liftNo, currnetFloorNo + 1);
        liftStop.currentDirection = "up";
      } else {
        this.#setLiftToFloor(liftNo, currnetFloorNo - 1);
        liftStop.currentDirection = "down";
      }
      return;
    }
  }

  async #setLiftToFloor(liftNo: number, floorNo: number) {
    try {
      const newBottomValue = `${(floorNo - 1) * 10}%`;
      const currentValue = `${this.#getCurrentBottomValue(liftNo)}`;

      this.#liftAnimationState.set(liftNo, true);
      const animation = this.#getLift(liftNo).animate(
        [{ bottom: currentValue }, { bottom: newBottomValue }],
        {
          duration: 2000,
          iterations: 1,
          fill: "forwards",
        }
      );

      await animation.finished;
      console.log("Animation finished");
      animation.commitStyles();
      this.#liftAnimationState.set(liftNo, false);
      this.#startLift(liftNo);
    } catch (err) {
      console.log(err);
    }
  }

  #getCurrentBottomValue(liftNo: number) {
    const bottomValue = this.#getLift(liftNo).style.bottom;
    return bottomValue;
  }

  #getCurrentFloorNo(liftNo: number) {
    const currnetFloorNo =
      parseInt(this.#getCurrentBottomValue(liftNo).replace("%", "")) / 10 + 1;

    return currnetFloorNo;
  }

  #getLift(no: number) {
    return document.getElementById(`lift-no-${no}`)!;
  }

  /**
   * Can be called only once
   */
  render(ele: HTMLElement) {
    if (this.#isRenderCalled) {
      throw new Error("Cannot call render more than once");
    }
    this.#isRenderCalled = true;

    ele.innerHTML = (() => {
      let innerHTML = "";
      for (let i = 1; i <= this.#noOfFloors; i++) {
        innerHTML += `<div class="floor">
  <div class="lift-button-container">
        <button class="lift-button" type="button" id="up-${i}">Up</button>
        <button class="lift-button" type="button" id="down-${i}">Down</button>
  </div>
</div>`;
      }

      for (let i = 1; i <= this.#noOfLifts; i++) {
        innerHTML += `<div class="lift" style="left: ${
          i * 40 + 20
        }px; bottom: 0%" id="lift-no-${i}"></div>`;
      }
      return innerHTML;
    })();

    this.#registerEventListeners();
  }
}
