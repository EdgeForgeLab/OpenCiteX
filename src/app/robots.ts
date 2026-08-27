import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/setup",
        "/recover",
        "/dashboard",
        "/brands",
        "/byok",
        "/jobs",
        "/scans",
        "/logs",
        "/results",
        "/prompts",
        "/settings",
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
