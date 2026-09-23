import { createFileRoute, Link } from "@tanstack/react-router";
import { Glows, SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BloxdStudio — bloxd.io community hub" },
      { name: "description", content: "Build bloxd.io scripts with snap-together coding blocks, then share them with the community." },
      { property: "og:title", content: "BloxdStudio — bloxd.io community hub" },
      { property: "og:description", content: "Snap-together coding blocks for bloxd.io. Build, copy, and share scripts." },
    ],
  }),
  component: Hub,
});



function Hub() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <section className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Snap code together.<br />Share it with everyone.</h1>
          <p className="mt-3 max-w-lg text-sm text-steel">Stack puzzle-piece blocks to make bloxd.io scripts, copy the code into your world, and trade project files with friends.</p>
          <Link to="/editor" className="btn-voxel mt-6 inline-block rounded-xl px-5 py-3 text-sm">Open the block editor</Link>
        </section>

        <section className="glass mt-8 rounded-2xl p-8 text-center">
          <h2 className="font-display text-2xl font-extrabold">See what builders are sharing</h2>
          <p className="mt-2 text-sm text-steel">Codes and schematics from the community live in the Forge.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/forge" className="btn-voxel rounded-xl px-5 py-3 text-sm">Visit the Forge</Link>
            <Link to="/schematic" className="btn-ghost rounded-xl px-5 py-3 text-sm">Build a schematic</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
