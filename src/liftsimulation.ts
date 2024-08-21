export class LiftSimulation {
  #isRenderCalled = false;

  #noOfFloors: number;
  #noOfLifts: number;

  #liftState: Map<
    number,
    {
      state: "stopped" | "animating";
      floorNo: number;
      direction: "up" | "down";
    }
  >;
  #requestQueue: Array<{ floor: number; direction: "up" | "down" }>;

  constructor(noOfFloors: number, noOfLifts: number) {
    this.#noOfFloors = noOfFloors;
    this.#noOfLifts = noOfLifts;
    this.#liftState = new Map();
    this.#requestQueue = [];

    for (let i = 1; i <= noOfLifts; i++) {
      this.#liftState.set(i, {
        state: "stopped",
        floorNo: 1,
        direction: "up",
      });
    }
  }

  #registerEventListeners() {
    for (let i = 1; i <= this.#noOfFloors; i++) {
      document
        .getElementById(`up-${i}`)
        ?.addEventListener("click", async () => {
          const liftButton = document.getElementById(`up-${i}`)!;
          const liftButtonDown = document.getElementById(`down-${i}`)!;

          liftButton.setAttribute("disabled", "true");
          liftButtonDown.setAttribute("disabled", "true");

          if (!this.#isRequestUnique(i, "up")) {
            return;
          }
          const nearestLift = this.#nearestLiftToFloor(i);

          console.log({ nearestLift });

          if (nearestLift === null) {
            this.#requestQueue.push({ floor: i, direction: "up" });
            return;
          }

          this.#liftState.set(nearestLift.liftNo, {
            floorNo: i,
            state: "animating",
            direction: "up",
          });

          this.#startLift(nearestLift.liftNo, "up");
        });

      document
        .getElementById(`down-${i}`)
        ?.addEventListener("click", async () => {
          document
            .getElementById(`down-${i}`)!
            .setAttribute("disabled", "true");

          document.getElementById(`up-${i}`)!.setAttribute("disabled", "true");

          const direction = "up";

          if (!this.#isRequestUnique(i, direction)) {
            return;
          }

          const nearestLift = this.#nearestLiftToFloor(i);

          if (nearestLift === null) {
            this.#requestQueue.push({ floor: i, direction: direction });
            return;
          }

          this.#liftState.set(nearestLift.liftNo, {
            floorNo: i,
            state: "animating",
            direction: direction,
          });

          this.#startLift(nearestLift.liftNo, direction);
        });
    }
  }
  #isRequestUnique(floorNo: number, direction: "up" | "down") {
    for (let liftNo = 1; liftNo <= this.#noOfLifts; liftNo++) {
      const liftState = this.#liftState.get(liftNo)!;

      if (
        liftState.state === "animating" &&
        liftState.floorNo === floorNo &&
        liftState.direction === direction
      ) {
        return false;
      } else if (
        liftState.state === "stopped" &&
        liftState.floorNo === floorNo
      ) {
        this.#startLift(liftNo, direction);
        return false;
      }
    }

    return !this.#requestQueue.some(
      ({ floor, direction: requestDir }) =>
        floor === floorNo && requestDir === direction,
    );
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

    console.log({ freeLifts });
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

  async #startLift(liftNo: number, direction: "up" | "down") {
    const currentFloorNo = this.#getCurrentFloorNo(liftNo);
    const destinationFloorNo = this.#liftState.get(liftNo)!.floorNo;

    this.#liftState.set(liftNo, {
      direction: direction,
      state: "animating",
      floorNo: destinationFloorNo,
    });

    const isDestinationReached = currentFloorNo === destinationFloorNo;

    console.log({ isDestinationReached, currentFloorNo, destinationFloorNo });

    if (isDestinationReached) {
      await this.#openAndCloseLiftDoor(liftNo, direction);
      const anyMoreRequest = this.#requestQueue.length !== 0;

      if (anyMoreRequest) {
        const nextRequest = this.#requestQueue.shift()!;

        this.#liftState.set(liftNo, {
          state: "animating",
          floorNo: nextRequest.floor,
          direction: nextRequest.direction,
        });
        this.#startLift(liftNo, direction);
        return;
      }

      this.#liftState.set(liftNo, {
        state: "stopped",
        floorNo: currentFloorNo,
        direction: direction,
      });

      return;
    }
    const nextFloorNo =
      currentFloorNo > destinationFloorNo
        ? currentFloorNo - 1
        : currentFloorNo + 1;

    console.log({ nextFloorNo });

    this.#setLiftToFloor(liftNo, nextFloorNo, direction);
  }

  async #setLiftToFloor(
    liftNo: number,
    floorNo: number,
    direction: "up" | "down",
  ) {
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
        },
      );

      await animation.finished;
      animation.commitStyles();
      this.#getLift(liftNo).style.bottom = `${newBottomValue}`;
      this.#startLift(liftNo, direction);
    } catch (err) {
      console.log(err);
    }
  }

  async #openAndCloseLiftDoor(liftNo: number, direction: "up" | "down") {
    const leftDoor = this.#getLeftDoor(liftNo);
    const rightDoor = this.#getRightDoor(liftNo);

    const leftDoorAnimation = leftDoor.animate(
      [
        {
          transform: `translateX(0%)`,
        },
        { transform: `translateX(-100%)` },
        { transform: `translateX(0%)` },
      ],
      { duration: 5000 },
    );

    const rightDoorAnimation = rightDoor.animate(
      [
        {
          transform: `translateX(0%)`,
        },
        { transform: `translateX(100%)` },
        { transform: `translateX(0%)` },
      ],
      { duration: 5000 },
    );

    const currentState = this.#liftState.get(liftNo);

    if (!currentState) {
      throw new Error("Lift state not found");
    }

    const animationFinished = Promise.all([
      leftDoorAnimation.finished,
      rightDoorAnimation.finished,
    ]).then(() => {
      const liftCurrentFloor = this.#getCurrentFloorNo(liftNo);
      const upId = `up-${liftCurrentFloor}`;
      const downId = `down-${liftCurrentFloor}`;

      console.log(
        `Animation finished running removing disabled state on id: ${upId}, ${downId}`,
      );
      document.getElementById(upId)!.removeAttribute("disabled");
      document.getElementById(downId)!.removeAttribute("disabled");
    });

    return animationFinished;
  }

  #getCurrentBottomValue(liftNo: number) {
    const bottomValue = this.#getLift(liftNo).style.bottom;
    return bottomValue;
  }

  #getCurrentFloorNo(liftNo: number) {
    console.log({ currentBottomNo: this.#getCurrentBottomValue(liftNo) });
    const currnetFloorNo = Math.round(
      parseInt(this.#getCurrentBottomValue(liftNo).replace("%", "")) /
        (100 / this.#noOfFloors) +
        1,
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
        innerHTML += `<div class="floor" data-floor-no="${i}" data-reverse-floor-no="${this.#noOfFloors - i + 1}">
  <div class="lift-button-container">
        <button class="lift-button" type="button" id="up-${i}" data-reverse-id="up-${this.#noOfFloors - i + 1}">Up</button>
        <p class="floor-no">${i}</p>
        <button class="lift-button" type="button" id="down-${i}" data-reverse-id="down-${this.#noOfFloors - i + 1}">Down</button>
  </div>
</div>`;
      }

      for (let i = 1; i <= this.#noOfLifts; i++) {
        innerHTML +=
          // prettier-ignore
          `<div class="lift" style="left: ${i * 70 + 20}px; bottom: 0%" id="lift-no-${i}">
           <div id="left-door-${i}" class="lift-door"></div>
           <div id="right-door-${i}" class="lift-door"></div>
        </div>`;
      }

      innerHTML += `<a class="go-back-link" href="/">Go back</a>`;

      const widthOfContainer = this.#noOfLifts * 70 + 20 + 80;
      ele.style.width = `max(${widthOfContainer}px, 100vw - 8px)`;
      return innerHTML;
    })();

    this.#registerEventListeners();
  }
}
