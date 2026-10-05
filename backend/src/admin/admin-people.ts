import type { Model, Types } from 'mongoose';
import type { Role, User } from '../users/schemas/user.schema.js';

export type PersonInfo = { name: string; role: Role };

// Names and roles for "who changed this" timelines, in one query.
export async function loadPeople(
  userModel: Model<User>,
  ids: (Types.ObjectId | null | undefined)[],
): Promise<Map<string, PersonInfo>> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map();
  const users = await userModel.find({ _id: { $in: unique } }, 'name role').lean().exec();
  return new Map(users.map((u) => [String(u._id), { name: u.name, role: u.role }]));
}

// Turns [{ _id: 'a', count: 2 }, …] into { a: 2, … } with every key present.
export function countsBy<K extends string>(
  keys: readonly K[],
  rows: { _id: unknown; count: number }[],
): Record<K | 'all', number> {
  const result = { all: 0 } as Record<K | 'all', number>;
  for (const key of keys) result[key] = 0;
  for (const row of rows) {
    if (keys.includes(row._id as K)) result[row._id as K] = row.count;
    result.all += row.count;
  }
  return result;
}
