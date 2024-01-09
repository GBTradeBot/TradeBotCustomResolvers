import { duration } from 'moment';
import Config from '../interfaces/Config';

export function groupBy<T>(objects: T[], param: keyof T) {
  const groups = new Map<any, T[]>();

  for (const obj of objects) {
    const value = obj[param]!;
    const group = groups.get(value);

    if (group) {
      group.push(obj);
    } else {
      groups.set(obj[param]!, [obj]);
    }
  }

  return groups;
}

export const sleep = async (delayInMs: number) =>
  new Promise((r) => setTimeout(r, delayInMs));

export function configToMs(configFromAdmin: any): Config {
  return {
    maxTimeToTrySbcInMs: duration(
      configFromAdmin.maxTimeToTrySbc,
      'minutes'
    ).asMilliseconds(),
    sbcDurationInMs: duration(
      configFromAdmin.sbcDuration,
      'minutes'
    ).asMilliseconds(),
    shouldTrySbc: configFromAdmin.shouldTrySbc,
  };
}
