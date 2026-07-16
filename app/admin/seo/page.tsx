"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  Tag,
  Package,
  FolderTree,
  Loader2,
} from "lucide-react";
import { generateProductSchema, generateOrganizationSchema, generateWebSiteSchema } from "@/lib/schema";

interface SEOStats {
  totalProducts: number;
  totalCategories: number;
  totalBrands: number;
  totalSitemapUrls: number;
  productsWithoutSEO: number;
  productsWithoutImages: number;
  categoriesWithoutDescription: number;
  brandsWithoutLogo: number;
  healthScore: number;
}

interface ProductPreview {
  _id: string;
  name: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  images?: string[];
}

interface CategoryPreview {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

interface BrandPreview {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
}

interface SEOData {
  stats: SEOStats;
  robotsTxt: string;
  siteConfig: {
    name: string;
    url: string;
    description: string;
  };
  recentProducts: ProductPreview[];
  recentCategories: CategoryPreview[];
  recentBrands: BrandPreview[];
}

export default function SEODashboardPage() {
  const [data, setData] = useState<SEOData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string>("organization");

  useEffect(() => {
    fetchSEOData();
  }, []);

  const fetchSEOData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) throw new Error("Failed to fetch SEO data");
      const seoData = await res.json();
      setData(seoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  // Sample schemas for preview
  const sampleSchemas = {
    organization: generateOrganizationSchema(),
    website: generateWebSiteSchema(),
    product: generateProductSchema({
      name: "Sample Product",
      slug: "sample-product",
      description: "This is a sample product description",
      images: ["/images/sample.jpg"],
      priceB2C: 1999,
      mrp: 2499,
      stock: 10,
      sku: "SAMPLE001",
      brand: "Sample Brand",
      category: { name: "Sample Category", slug: "sample-category" },
    }),
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={fetchSEOData}>Try Again</Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SEO Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor and manage your site&apos;s technical SEO health
          </p>
        </div>
        <Button onClick={fetchSEOData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Health Score Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full ${getHealthBg(data.stats.healthScore)}`}>
                <span className={`text-3xl font-bold ${getHealthColor(data.stats.healthScore)}`}>
                  {data.stats.healthScore}%
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">SEO Health Score</h2>
                <p className="text-sm text-muted-foreground">
                  {data.stats.healthScore >= 80 
                    ? "Excellent! Your SEO is in great shape."
                    : data.stats.healthScore >= 60
                    ? "Good, but there are areas to improve."
                    : "Needs attention. Review the issues below."}
                </p>
              </div>
            </div>
            <TrendingUp className={`h-8 w-8 ${getHealthColor(data.stats.healthScore)}`} />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sitemap URLs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalSitemapUrls}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-updated when content changes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalProducts}</div>
            <div className="mt-1 flex items-center gap-2">
              {data.stats.productsWithoutSEO > 0 ? (
                <Badge variant="destructive" className="text-[10px]">
                  {data.stats.productsWithoutSEO} missing SEO
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-600 text-[10px]">
                  All optimized
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalCategories}</div>
            <div className="mt-1 flex items-center gap-2">
              {data.stats.categoriesWithoutDescription > 0 ? (
                <Badge variant="secondary" className="text-[10px]">
                  {data.stats.categoriesWithoutDescription} need description
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-600 text-[10px]">
                  All complete
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Brands</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalBrands}</div>
            <div className="mt-1 flex items-center gap-2">
              {data.stats.brandsWithoutLogo > 0 ? (
                <Badge variant="secondary" className="text-[10px]">
                  {data.stats.brandsWithoutLogo} missing logo
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-600 text-[10px]">
                  All complete
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Section */}
      {(data.stats.productsWithoutSEO > 0 || 
        data.stats.productsWithoutImages > 0 || 
        data.stats.categoriesWithoutDescription > 0 || 
        data.stats.brandsWithoutLogo > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              SEO Issues to Address
            </CardTitle>
            <CardDescription>
              Fix these issues to improve your SEO health score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.stats.productsWithoutSEO > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                      <FileText className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Products without meta title/description</p>
                      <p className="text-xs text-muted-foreground">
                        Add SEO metadata to improve search visibility
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">{data.stats.productsWithoutSEO}</Badge>
                </div>
              )}
              
              {data.stats.productsWithoutImages > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                      <ImageIcon className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Products without images</p>
                      <p className="text-xs text-muted-foreground">
                        Add product images for better engagement
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{data.stats.productsWithoutImages}</Badge>
                </div>
              )}

              {data.stats.categoriesWithoutDescription > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                      <FolderTree className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Categories without description</p>
                      <p className="text-xs text-muted-foreground">
                        Add descriptions to category pages
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{data.stats.categoriesWithoutDescription}</Badge>
                </div>
              )}

              {data.stats.brandsWithoutLogo > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                      <Tag className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Brands without logo</p>
                      <p className="text-xs text-muted-foreground">
                        Add logos to brand pages for better visuals
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{data.stats.brandsWithoutLogo}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Sitemap, Robots, Schema */}
      <Tabs defaultValue="sitemap" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="robots">Robots.txt</TabsTrigger>
          <TabsTrigger value="schema">Schema Markup</TabsTrigger>
        </TabsList>

        {/* Sitemap Tab */}
        <TabsContent value="sitemap">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    XML Sitemap
                  </CardTitle>
                  <CardDescription>
                    Auto-generated sitemap with {data.stats.totalSitemapUrls} URLs
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Sitemap
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="mb-3 text-sm font-semibold">Sitemap Contents</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 rounded-md bg-white p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Static Pages</p>
                      <p className="text-xs text-muted-foreground">9 URLs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-green-100">
                      <Package className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Products</p>
                      <p className="text-xs text-muted-foreground">{data.stats.totalProducts} URLs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-100">
                      <FolderTree className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Categories</p>
                      <p className="text-xs text-muted-foreground">{data.stats.totalCategories} URLs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-100">
                      <Tag className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Brands</p>
                      <p className="text-xs text-muted-foreground">{data.stats.totalBrands} URLs</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-green-50 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      Sitemap auto-updates when categories, brands, or products are added/removed
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Robots.txt Tab */}
        <TabsContent value="robots">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    Robots.txt
                  </CardTitle>
                  <CardDescription>
                    Controls how search engines crawl your site
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(data.robotsTxt, "robots")}
                  >
                    {copiedItem === "robots" ? (
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copiedItem === "robots" ? "Copied!" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/robots.txt" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View File
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-sm">
                {data.robotsTxt}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Schema Markup (JSON-LD)
              </CardTitle>
              <CardDescription>
                Structured data automatically added to all pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Schema Type Selector */}
                <div className="flex gap-2">
                  <Button 
                    variant={selectedSchema === "organization" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSchema("organization")}
                  >
                    Organization
                  </Button>
                  <Button 
                    variant={selectedSchema === "website" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSchema("website")}
                  >
                    WebSite
                  </Button>
                  <Button 
                    variant={selectedSchema === "product" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSchema("product")}
                  >
                    Product
                  </Button>
                </div>

                {/* Schema Preview */}
                <div className="relative">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="absolute right-2 top-2 z-10"
                    onClick={() => copyToClipboard(
                      JSON.stringify(sampleSchemas[selectedSchema as keyof typeof sampleSchemas], null, 2), 
                      `schema-${selectedSchema}`
                    )}
                  >
                    {copiedItem === `schema-${selectedSchema}` ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
                    {JSON.stringify(sampleSchemas[selectedSchema as keyof typeof sampleSchemas], null, 2)}
                  </pre>
                </div>

                {/* Schema Types Summary */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="mb-3 text-sm font-semibold">Schema Types by Page</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page Type</TableHead>
                        <TableHead>Schema Types</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Homepage</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">Organization</Badge>
                            <Badge variant="outline">WebSite</Badge>
                            <Badge variant="outline">LocalBusiness</Badge>
                          </div>
                        </TableCell>
                        <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Product Pages</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">Product</Badge>
                            <Badge variant="outline">BreadcrumbList</Badge>
                            <Badge variant="outline">Organization</Badge>
                          </div>
                        </TableCell>
                        <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Category Pages</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">CollectionPage</Badge>
                            <Badge variant="outline">BreadcrumbList</Badge>
                            <Badge variant="outline">ItemList</Badge>
                          </div>
                        </TableCell>
                        <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Brand Pages</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">CollectionPage</Badge>
                            <Badge variant="outline">BreadcrumbList</Badge>
                            <Badge variant="outline">ItemList</Badge>
                          </div>
                        </TableCell>
                        <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">About Page</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">AboutPage</Badge>
                            <Badge variant="outline">Organization</Badge>
                            <Badge variant="outline">BreadcrumbList</Badge>
                          </div>
                        </TableCell>
                        <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Content with SEO Status */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Content SEO Status</CardTitle>
          <CardDescription>
            Review SEO completion for recently updated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="brands">Brands</TabsTrigger>
            </TabsList>
            
            <TabsContent value="products" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Meta Title</TableHead>
                    <TableHead>Meta Description</TableHead>
                    <TableHead>Images</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentProducts.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        {product.metaTitle ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        {product.metaDescription ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        {product.images && product.images.length > 0 ? (
                          <Badge variant="outline">{product.images.length}</Badge>
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.recentProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="categories" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentCategories.map((category) => (
                    <TableRow key={category._id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.description ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        {category.image ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.recentCategories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No categories found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="brands" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Logo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentBrands.map((brand) => (
                    <TableRow key={brand._id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>
                        {brand.description ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        {brand.logo ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.recentBrands.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No brands found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
