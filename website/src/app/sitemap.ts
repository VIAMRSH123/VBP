import type { MetadataRoute } from "next";
import { company } from "@/content/company";
import { categories, products } from "@/content/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = company.siteUrl;
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/products`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/about`, lastModified, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/contact`, lastModified, changeFrequency: "yearly", priority: 0.8 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/products/${category.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${base}/products/${product.category}/${product.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
