import { createFileRoute } from "@tanstack/react-router";
import { PhotoBooth } from "@/components/PhotoBooth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Retro Photo Booth — 4-Shot Webcam Strips" },
      { name: "description", content: "Snap four webcam photos with vintage filters and download a classic 2x6 photo strip." },
      { property: "og:title", content: "Retro Photo Booth" },
      { property: "og:description", content: "Snap four webcam photos with vintage filters and download a classic 2x6 photo strip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhotoBooth,
});
