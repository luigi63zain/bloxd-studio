type CountTable = "forge_posts" | "hub_posts";
type CountReader = (table: CountTable) => Promise<number | undefined>;

export async function loadHomeStats(userId: string | undefined, readCount: CountReader) {
  const [forge, posts] = await Promise.all([
    readCount("forge_posts"),
    userId ? readCount("hub_posts") : Promise.resolve(undefined),
  ]);
  return { forge, posts };
}