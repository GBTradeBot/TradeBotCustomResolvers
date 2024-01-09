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
