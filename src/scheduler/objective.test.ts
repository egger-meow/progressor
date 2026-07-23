import { describe, expect, it } from "vitest";
import { pickBestCandidate, scoreCandidate, type KindedInterval, type PlacementCandidate } from "./objective";

const day = new Date("2026-07-13T00:00:00"); // Monday
const otherDay = new Date("2026-07-14T00:00:00"); // Tuesday

function candidate(overrides: Partial<PlacementCandidate> = {}): PlacementCandidate {
  return {
    interval: {
      start: new Date("2026-07-13T08:00:00"),
      end: new Date("2026-07-13T10:00:00"),
    },
    day,
    leftoverMs: 0,
    ...overrides,
  };
}

describe("scoreCandidate", () => {
  it("penalizes a leftover below the fragmentation threshold (a dead, unusable sliver)", () => {
    const withSliver = scoreCandidate(candidate({ leftoverMs: 10 * 60 * 1000 }), []);
    const withNoLeftover = scoreCandidate(candidate({ leftoverMs: 0 }), []);
    expect(withSliver).toBeLessThan(withNoLeftover);
  });

  it("scores a genuinely usable leftover higher than both a dead sliver and a perfect fill", () => {
    const withSliver = scoreCandidate(candidate({ leftoverMs: 10 * 60 * 1000 }), []);
    const withNoLeftover = scoreCandidate(candidate({ leftoverMs: 0 }), []);
    const withUsableBlock = scoreCandidate(candidate({ leftoverMs: 3 * 60 * 60 * 1000 }), []);
    expect(withUsableBlock).toBeGreaterThan(withSliver);
    expect(withUsableBlock).toBeGreaterThan(withNoLeftover);
  });

  it("caps the free-block reward past MAX_USEFUL_LEFTOVER_MS instead of letting one huge gap dominate everything", () => {
    const fourHourLeftover = scoreCandidate(candidate({ leftoverMs: 4 * 60 * 60 * 1000 }), []);
    const twelveHourLeftover = scoreCandidate(candidate({ leftoverMs: 12 * 60 * 60 * 1000 }), []);
    expect(twelveHourLeftover).toBe(fourHourLeftover);
  });

  it("prefers an emptier day when free-block scores are otherwise identical", () => {
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T14:00:00") },
    ];
    const emptyDayScore = scoreCandidate(candidate({ day: otherDay, leftoverMs: 3 * 60 * 60 * 1000 }), busy);
    const busyDayScore = scoreCandidate(candidate({ day, leftoverMs: 3 * 60 * 60 * 1000 }), busy);
    expect(emptyDayScore).toBeGreaterThan(busyDayScore);
  });

  it("prefers an earlier start time within the day (EnergyAlignment's generic default)", () => {
    const earlyScore = scoreCandidate(
      candidate({ interval: { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T10:00:00") } }),
      [],
    );
    const lateScore = scoreCandidate(
      candidate({ interval: { start: new Date("2026-07-13T20:00:00"), end: new Date("2026-07-13T22:00:00") } }),
      [],
    );
    expect(earlyScore).toBeGreaterThan(lateScore);
  });

  it("does not penalize a candidate touching another Trackable Item session (continuity, not a switch)", () => {
    const kindedBusy: KindedInterval[] = [
      {
        start: new Date("2026-07-13T06:00:00"),
        end: new Date("2026-07-13T08:00:00"),
        occupantType: "trackable-item",
      },
    ];
    const touchingSameKind = scoreCandidate(candidate(), [], kindedBusy);
    const noNeighbor = scoreCandidate(candidate(), [], []);
    expect(touchingSameKind).toBe(noNeighbor);
  });

  it("penalizes a candidate that's back-to-back with a different-kind occupant (ContextSwitching)", () => {
    const kindedBusyRoutine: KindedInterval[] = [
      { start: new Date("2026-07-13T06:00:00"), end: new Date("2026-07-13T08:00:00"), occupantType: "routine" },
    ];
    const touchingDifferentKind = scoreCandidate(candidate(), [], kindedBusyRoutine);
    const noNeighbor = scoreCandidate(candidate(), [], []);
    expect(touchingDifferentKind).toBeLessThan(noNeighbor);
  });

  it("does not penalize a different-kind occupant that's on the same day but far away", () => {
    const kindedBusyFarAway: KindedInterval[] = [
      { start: new Date("2026-07-13T20:00:00"), end: new Date("2026-07-13T21:00:00"), occupantType: "routine" },
    ];
    const farNeighbor = scoreCandidate(candidate(), [], kindedBusyFarAway);
    const noNeighbor = scoreCandidate(candidate(), [], []);
    expect(farNeighbor).toBe(noNeighbor);
  });

  it("doubles the penalty when sandwiched between two different-kind occupants on both sides", () => {
    const oneSided: KindedInterval[] = [
      { start: new Date("2026-07-13T06:00:00"), end: new Date("2026-07-13T08:00:00"), occupantType: "routine" },
    ];
    const sandwiched: KindedInterval[] = [
      ...oneSided,
      { start: new Date("2026-07-13T10:00:00"), end: new Date("2026-07-13T12:00:00"), occupantType: "fixed-commitment" },
    ];
    const oneSidedScore = scoreCandidate(candidate(), [], oneSided);
    const sandwichedScore = scoreCandidate(candidate(), [], sandwiched);
    expect(sandwichedScore).toBeLessThan(oneSidedScore);
  });
});

describe("pickBestCandidate", () => {
  it("returns null when there are no candidates", () => {
    expect(pickBestCandidate([], [])).toBeNull();
  });

  it("picks the strictly-higher-scoring candidate", () => {
    const good = candidate({ leftoverMs: 3 * 60 * 60 * 1000 });
    const bad = candidate({ leftoverMs: 10 * 60 * 1000 });
    const best = pickBestCandidate([bad, good], []);
    expect(best?.leftoverMs).toBe(good.leftoverMs);
  });

  it("breaks an exact tie by keeping the earliest candidate in list order", () => {
    const a = candidate({ interval: { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T10:00:00") } });
    const b = candidate({ interval: { start: new Date("2026-07-14T08:00:00"), end: new Date("2026-07-14T10:00:00") } });
    const best = pickBestCandidate([a, b], []);
    expect(best?.interval.start).toEqual(a.interval.start);
  });
});
