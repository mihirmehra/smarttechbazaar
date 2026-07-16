import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import JsonLd from "./JsonLd";
import { generateBreadcrumbSchema } from "@/lib/schema";
import { getFullUrl } from "@/lib/site-config";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
  className?: string;
}

export default function Breadcrumbs({ 
  items, 
  showHomeIcon = false,
  className = "" 
}: BreadcrumbsProps) {
  // Build full breadcrumb list with Home
  const fullItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...items
  ];

  // Generate schema data
  const schemaItems = fullItems.map((item, index) => ({
    name: item.label,
    url: item.href ? getFullUrl(item.href) : getFullUrl("/"),
  }));

  return (
    <>
      {/* Schema markup */}
      <JsonLd data={generateBreadcrumbSchema(schemaItems)} />
      
      {/* Visual breadcrumbs */}
      <nav 
        aria-label="Breadcrumb" 
        className={`border-b border-border bg-white ${className}`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-3 py-2.5 md:px-4">
          <ol className="flex items-center gap-1.5" itemScope itemType="https://schema.org/BreadcrumbList">
            {fullItems.map((item, index) => {
              const isLast = index === fullItems.length - 1;
              const isFirst = index === 0;

              return (
                <li 
                  key={index}
                  className="flex items-center gap-1.5"
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                >
                  {index > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  )}
                  
                  {isLast ? (
                    <span 
                      className="line-clamp-1 text-[11px] font-medium text-foreground"
                      itemProp="name"
                    >
                      {isFirst && showHomeIcon ? (
                        <Home className="h-3.5 w-3.5" aria-label="Home" />
                      ) : (
                        item.label
                      )}
                    </span>
                  ) : (
                    <Link
                      href={item.href || "/"}
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      itemProp="item"
                    >
                      <span itemProp="name">
                        {isFirst && showHomeIcon ? (
                          <Home className="h-3.5 w-3.5" aria-label="Home" />
                        ) : (
                          item.label
                        )}
                      </span>
                    </Link>
                  )}
                  <meta itemProp="position" content={String(index + 1)} />
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </>
  );
}
