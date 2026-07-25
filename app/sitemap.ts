import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = config.siteUrl;
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/order`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/franchise`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/branches`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/links`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/refunds`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
