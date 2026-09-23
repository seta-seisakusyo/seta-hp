/** URLからPrisma Intの範囲内にある十進表記の正のIDを取り出す。 */
export function parsePositiveId(raw: string | null): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647 ? id : null;
}
