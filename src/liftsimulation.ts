export class LiftSimulation {
  #isRenderCalled = false;

  #noOfFloors: number;
  #noOfLifts: number;

  #liftState: Map<number, { state: "stopped" | "animating"; floorNo: number }>;
  #requestQueue: Array<number>;

  constructor(noOfFloors: number, noOfLifts: number) {
    this.#noOfFloors = noOfFloors;
    this.#noOfLifts = noOfLifts;
    this.#liftState = new Map();
    this.#requestQueue = [];

    for (let i = 1; i <= noOfLifts; i++) {
      this.#liftState.set(i, { state: "stopped", floorNo: i });
    }
  }

  #registerEventListeners() {
    for (let i = 1; i <= this.#noOfFloors; i++) {
      document
        .getElementById(`up-${i}`)
        ?.addEventListener("click", async () => {
          if (!this.#isRequestUnique(i)) {
            return;
          }
          const nearestLift = this.#nearestLiftToFloor(i);

          if (nearestLift === null) {
            this.#requestQueue.push(i);
            return;
          }

          this.#liftState.set(nearestLift.liftNo, {
            floorNo: i,
            state: "animating",
          });

          this.#startLift(nearestLift.liftNo);
        });

      document
        .getElementById(`down-${i}`)
        ?.addEventListener("click", async () => {
          if (!this.#isRequestUnique(i)) {
            return;
          }

          const nearestLift = this.#nearestLiftToFloor(i);

          if (nearestLift === null) {
            this.#requestQueue.push(i);
            return;
          }

          this.#liftState.set(nearestLift.liftNo, {
            floorNo: i,
            state: "animating",
          });

          this.#startLift(nearestLift.liftNo);
        });
    }
  }
  #isRequestUnique(floorNo: number) {
    for (let liftNo = 1; liftNo <= this.#noOfLifts; liftNo++) {
      const liftState = this.#liftState.get(liftNo)!;

      if (liftState.state === "animating" && liftState.floorNo === floorNo) {
        return false;
      } else if (
        liftState.state === "stopped" &&
        liftState.floorNo === floorNo
      ) {
        this.#liftState.set(liftNo, { floorNo: floorNo, state: "animating" });
        this.#startLift(liftNo);
        return false;
      }
    }

    return !this.#requestQueue.includes(floorNo);
  }
  #nearestLiftToFloor(floorNo: number) {
    const freeLifts: Array<{
      state: "stopped";
      floorNo: number;
      liftNo: number;
    }> = [];

    for (let liftNo = 1; liftNo <= this.#noOfLifts; liftNo++) {
      const liftState = this.#liftState.get(liftNo)!;

      if (liftState.state === "stopped") {
        freeLifts.push({ ...liftState, state: liftState.state, liftNo });
      }
    }

    if (freeLifts.length === 0) {
      return null;
    }

    let nearestLift: null | {
      distance: number;
      liftNo: number;
    } = null;

    freeLifts.forEach(({ floorNo: liftFloorNo, liftNo }) => {
      const currentLiftDistance = Math.abs(liftFloorNo - floorNo);
      if (nearestLift === null) {
        nearestLift = { distance: currentLiftDistance, liftNo };
        return;
      }

      const isNearby = nearestLift.distance > currentLiftDistance;

      if (isNearby) {
        nearestLift = { distance: currentLiftDistance, liftNo };
        return;
      }
    });

    return nearestLift as null | { distance: number; liftNo: number };
  }

  async #startLift(liftNo: number) {
    const currentFloorNo = this.#getCurrentFloorNo(liftNo);
    const destinationFloorNo = this.#liftState.get(liftNo)!.floorNo;

    const isDestinationReached = currentFloorNo === destinationFloorNo;

    if (isDestinationReached) {
      await this.#openAndCloseLiftDoor(liftNo);
      const anyMoreRequest = this.#requestQueue.length !== 0;

      if (anyMoreRequest) {
        const nextRequest = this.#requestQueue.shift()!;

        this.#liftState.set(liftNo, {
          state: "animating",
          floorNo: nextRequest,
        });
        this.#startLift(liftNo);
        return;
      }

      this.#liftState.set(liftNo, {
        state: "stopped",
        floorNo: currentFloorNo,
      });

      return;
    }
    const nextFloorNo =
      currentFloorNo > destinationFloorNo
        ? currentFloorNo - 1
        : currentFloorNo + 1;

    this.#setLiftToFloor(liftNo, nextFloorNo);
  }

  async #setLiftToFloor(liftNo: number, floorNo: number) {
    try {
      const newBottomValue = `${(floorNo - 1) * (100 / this.#noOfFloors)}%`;
      console.log({ newBottomValue });
      const currentValue = `${this.#getCurrentBottomValue(liftNo)}`;

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
      this.#startLift(liftNo);
    } catch (err) {
      console.log(err);
    }
  }

  async #openAndCloseLiftDoor(liftNo: number) {
    const leftDoor = this.#getLeftDoor(liftNo);
    const rightDoor = this.#getRightDoor(liftNo);

    const leftDoorAnimation = leftDoor.animate(
      [
        { transform: `translateX(0%)` },
        { transform: `translateX(-100%)` },
        { transform: `translateX(0%)` },
      ],
      { duration: 5_000 }
    ).finished;
    const rightDoorAnimation = rightDoor.animate(
      [
        { transform: `translateX(0%)` },
        { transform: `translateX(100%)` },
        { transform: `translateX(0%)` },
      ],
      { duration: 5_000 }
    ).finished;

    return Promise.all([leftDoorAnimation, rightDoorAnimation]);
  }

  #getCurrentBottomValue(liftNo: number) {
    const bottomValue = this.#getLift(liftNo).style.bottom;
    return bottomValue;
  }

  #getCurrentFloorNo(liftNo: number) {
    const currnetFloorNo = Math.round(
      parseInt(this.#getCurrentBottomValue(liftNo).replace("%", "")) /
        (100 / this.#noOfFloors) +
        1
    );

    return currnetFloorNo;
  }

  #getLift(no: number) {
    return document.getElementById(`lift-no-${no}`)!;
  }

  #getLeftDoor(no: number) {
    return document.getElementById(`left-door-${no}`)!;
  }

  #getRightDoor(no: number) {
    return document.getElementById(`right-door-${no}`)!;
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
        <p class="floor-no">${i}</p>
        <button class="lift-button" type="button" id="down-${i}">Down</button>
  </div>
</div>`;
      }

      for (let i = 1; i <= this.#noOfLifts; i++) {
        innerHTML +=
          // prettier-ignore
          `<div class="lift" style="left: ${i * 70 + 20 }px; bottom: 0%" id="lift-no-${i}">
           <div id="left-door-${i}" class="lift-door"></div>
           <div id="right-door-${i}" class="lift-door"></div>
        </div>`;
      }

      innerHTML += `<a class="go-back-link" href="/">Go back</a>`;
      return innerHTML;
    })();

    this.#registerEventListeners();
  }
}
