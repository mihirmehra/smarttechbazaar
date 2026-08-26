import { NextResponse } from "next/server";
import { getCuratedSections, getHomepageSections } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const [curated, homepage] = await Promise.all([
    getCuratedSections(),
    getHomepageSections(),
  ]);

  const summarize = (sections: Awaited<ReturnType<typeof getCuratedSections>>) =>
    sections.map((s) => ({
      title: s.title,
      slug: s.slug,
      count: s.products.length,
      names: s.products.map((p) => p.name),
    }));

  return NextResponse.json({
    curated: summarize(curated),
    homepage: summarize(homepage),
  });
}
