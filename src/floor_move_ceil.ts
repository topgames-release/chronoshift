module Chronoshift {
  export interface AlignFn {
    (dt: Date, tz: Timezone): Date;
  }

  export interface MoveFn {
    (dt: Date, tz: Timezone, step: number): Date;
  }

  export interface RoundFn {
    (dt: Date, roundTo: number, tz: Timezone): Date;
  }

  export interface TimeMover {
    canonicalLength: number;
    siblings?: number;
    floor: AlignFn;
    round?: RoundFn;
    move: MoveFn;
    ceil?: AlignFn;
  }

  function adjustDay(day: number): number {
    return (day + 6) % 7;
  }

  function timeMoverFiller(tm: TimeMover): TimeMover {
    var { floor, move } = tm;
    tm.ceil = (dt: Date, tz: Timezone) => {
      var floored = floor(dt, tz);
      if (floored.valueOf() === dt.valueOf()) return dt; // Just like ceil(3) is 3 and not 4
      return move(floored, tz, 1);
    };
    return tm;
  }

  export var second = timeMoverFiller({
    canonicalLength: 1000,
    siblings: 60,
    floor: (dt, tz) => {
      // Seconds do not actually need a timezone because all timezones align on seconds... for now...
      dt = new Date(dt.valueOf());
      dt.setUTCMilliseconds(0);
      return dt;
    },
    round: (dt, roundTo, tz) => {
      var cur = dt.getUTCSeconds();
      var adj = Math.floor(cur / roundTo) * roundTo;
      if (cur !== adj) dt.setUTCSeconds(adj);
      return dt;
    },
    move: (dt, tz, step) => {
      dt = new Date(dt.valueOf());
      dt.setUTCSeconds(dt.getUTCSeconds() + step);
      return dt;
    }
  });

  export var minute = timeMoverFiller({
    canonicalLength: 60000,
    siblings: 60,
    floor: (dt, tz) => {
      // Minutes do not actually need a timezone because all timezones align on minutes... for now...
      dt = new Date(dt.valueOf());
      dt.setUTCSeconds(0, 0);
      return dt;
    },
    round: (dt, roundTo, tz) => {
      var cur = dt.getUTCMinutes();
      var adj = Math.floor(cur / roundTo) * roundTo;
      if (cur !== adj) dt.setUTCMinutes(adj);
      return dt;
    },
    move: (dt, tz, step) => {
      dt = new Date(dt.valueOf());
      dt.setUTCMinutes(dt.getUTCMinutes() + step);
      return dt;
    }
  });

  function hourMove(dt: Date, tz: Timezone, step: number) {
    if (tz.isUTC()) {
      dt = new Date(dt.valueOf());
      dt.setUTCHours(dt.getUTCHours() + step);
    } else {
      let wt = WallTime.UTCToWallTime(dt, tz.toString());
      dt = WallTime.WallTimeToUTC(
        tz.toString(),
        wt.getFullYear(), wt.getMonth(), wt.getDate(),
        wt.getHours() + step, wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds()
      );
    }
    return dt;
  }

  export var hour = timeMoverFiller({
    canonicalLength: 3600000,
    siblings: 24,
    floor: (dt, tz) => {
      if (tz.isUTC()) {
        dt = new Date(dt.valueOf());
        dt.setUTCMinutes(0, 0, 0);
      } else {
        let wt = WallTime.UTCToWallTime(dt, tz.toString());
        dt = WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), wt.getDate(), wt.getHours(), 0, 0, 0);
      }
      return dt;
    },
    round: (dt, roundTo, tz) => {
      if (tz.isUTC()) {
        var cur = dt.getUTCHours();
        var adj = Math.floor(cur / roundTo) * roundTo;
        if (cur !== adj) dt.setUTCHours(adj);
      } else {
        var cur = dt.getHours();
        var adj = Math.floor(cur / roundTo) * roundTo;
        if (cur !== adj) return hourMove(dt, tz, adj - cur);
      }
      return dt;
    },
    move: hourMove
  });

  export var day = timeMoverFiller({
    canonicalLength: 24 * 3600000,
    floor: (dt, tz) => {
      if (tz.isUTC()) {
        dt = new Date(dt.valueOf());
        dt.setUTCHours(0, 0, 0, 0);
      } else {
        let wt = WallTime.UTCToWallTime(dt, tz.toString());
        dt = WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), wt.getDate(), 0, 0, 0, 0);
      }
      return dt;
    },
    move: (dt, tz, step) => {
      if (tz.isUTC()) {
        dt = new Date(dt.valueOf());
        dt.setUTCDate(dt.getUTCDate() + step);
      } else {
        let wt = WallTime.UTCToWallTime(dt, tz.toString());
        dt = WallTime.WallTimeToUTC(
          tz.toString(),
          wt.getFullYear(), wt.getMonth(), wt.getDate() + step,
          wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds()
        );
      }
      return dt;
    }
  });

  export var week = timeMoverFiller({
    canonicalLength: 7 * 24 * 3600000,
    floor: (dt, tz) => {
      if (tz.isUTC()) {
        dt = new Date(dt.valueOf());
        dt.setUTCHours(0, 0, 0, 0);
        dt.setUTCDate(dt.getUTCDate() - adjustDay(dt.getUTCDay()));
      } else {
        let wt = WallTime.UTCToWallTime(dt, tz.toString());
        dt = WallTime.WallTimeToUTC(
          tz.toString(),
          wt.getFullYear(), wt.getMonth(), wt.getDate() - adjustDay(wt.getDay()),
          0, 0, 0, 0
        );
      }
      return dt;
    },
    move: (dt, tz, step) => {
      if (tz.isUTC()) {
        dt = new Date(dt.valueOf());
        dt.setUTCDate(dt.getUTCDate() + step * 7);
      } else {
        let wt = WallTime.UTCToWallTime(dt, tz.toString());
        dt = WallTime.WallTimeToUTC(
          tz.toString(),
          wt.getFullYear(), wt.getMonth(), wt.getDate() + step * 7,
          wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds()
        );
      }
      return dt;
    }
  });

  function monthMove(dt: Date, tz: Timezone, step: number) {
    if (tz.isUTC()) {
      dt = new Date(dt.valueOf());
      dt.setUTCMonth(dt.getUTCMonth() + step);
    } else {
      let wt = WallTime.UTCToWallTime(dt, tz.toString());
      dt = WallTime.WallTimeToUTC(
        tz.toString(),
        wt.getFullYear(), wt.getMonth() + step, wt.getDate(),
        wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds()
      );
    }
    return dt;
  }

  export var month = timeMoverFiller({
    canonicalLength: 30 * 24 * 3600000,
    siblings: 12,
    floor: (dt, tz) => {
      if (tz.isUTC()) {
        dt = new Date(dt.valueOf());
        dt.setUTCHours(0, 0, 0, 0);
        dt.setUTCDate(1);
      } else {
        let wt = WallTime.UTCToWallTime(dt, tz.toString());
        dt = WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), 1, 0, 0, 0, 0);
      }
      return dt;
    },
    round: (dt, roundTo, tz) => {
      if (tz.isUTC()) {
        var cur = dt.getUTCMonth();
        var adj = Math.floor(cur / roundTo) * roundTo;
        if (cur !== adj) dt.setUTCMonth(adj);
      } else {
        var cur = dt.getMonth();
        var adj = Math.floor(cur / roundTo) * roundTo;
        if (cur !== adj) return monthMove(dt, tz, adj - cur);
      }
      return dt;
    },
    move: monthMove
  });

  function yearMove(dt: Date, tz: Timezone, step: number) {
    if (tz.isUTC()) {
      dt = new Date(dt.valueOf());
      dt.setUTCFullYear(dt.getUTCFullYear() + step);
    } else {
      let wt = WallTime.UTCToWallTime(dt, tz.toString());
      dt = WallTime.WallTimeToUTC(
        tz.toString(),
        wt.getFullYear() + step, wt.getMonth(), wt.getDate(),
        wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds()
      );
    }
    return dt;
  }

  export var year = timeMoverFiller({
    canonicalLength: 365 * 24 * 3600000,
    siblings: 1000,
    floor: (dt, tz) => {
      if (tz.isUTC()) {
        dt = new Date(dt.valueOf());
        dt.setUTCHours(0, 0, 0, 0);
        dt.setUTCMonth(0, 1);
      } else {
        let wt = WallTime.UTCToWallTime(dt, tz.toString());
        dt = WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), 0, 1, 0, 0, 0, 0);
      }
      return dt;
    },
    round: (dt, roundTo, tz) => {
      if (tz.isUTC()) {
        var cur = dt.getUTCFullYear();
        var adj = Math.floor(cur / roundTo) * roundTo;
        if (cur !== adj) dt.setUTCFullYear(adj);
      } else {
        var cur = dt.getFullYear();
        var adj = Math.floor(cur / roundTo) * roundTo;
        if (cur !== adj) return yearMove(dt, tz, adj - cur);
      }
      return dt;
    },
    move: yearMove
  });

  export var movers: Lookup<TimeMover> = {
    second: second,
    minute: minute,
    hour: hour,
    day: day,
    week: week,
    month: month,
    year: year
  };
}
