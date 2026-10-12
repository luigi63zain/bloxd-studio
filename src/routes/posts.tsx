import { createFileRoute } from "@tanstack/react-router";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { HubPosts } from "@/components/HubPosts";

export const Route = createFileRoute("/posts")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Posts — BloxdStudio" },
      { name: "description", content: "Read and share posts, links and pixel stickers with the BloxdStudio community." },
      { property: "og:title", content: "Posts — BloxdStudio" },
      { property: "og:description", content: "The BloxdStudio community feed for bloxd.io players." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostsPage,
});

function PostsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[900px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <HubPosts limit={100} title="Posts" />
      </div>
    </div>
  );
}
