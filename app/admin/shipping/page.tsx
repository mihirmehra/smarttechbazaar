import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import ShippingRate from "@/models/ShippingRate";
import {
  Plus,
  Truck,
  MapPin,
  IndianRupee,
  Clock,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DeleteShippingRateButton from "@/components/admin/DeleteShippingRateButton";
import ShippingFilters from "@/components/admin/ShippingFilters";

interface ShippingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getShippingRates(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    if (searchParams.search) {
      query.$or = [
        { name: { $regex: searchParams.search, $options: "i" } },
        { state: { $regex: searchParams.search, $options: "i" } },
        { city: { $regex: searchParams.search, $options: "i" } },
        { pincode: { $regex: searchParams.search, $options: "i" } },
      ];
    }

    if (searchParams.status === "active") {
      query.isActive = true;
    } else if (searchParams.status === "inactive") {
      query.isActive = false;
    }

    const rates = await ShippingRate.find(query)
      .sort({ state: 1, city: 1, rate: 1 })
      .lean();

    // Group by state
    type LeanRate = (typeof rates)[number];
    const groupedRates = rates.reduce((acc: Record<string, LeanRate[]>, rate: LeanRate) => {
      if (!acc[rate.state]) {
        acc[rate.state] = [];
      }
      acc[rate.state].push(rate);
      return acc;
    }, {});

    return {
      rates: JSON.parse(JSON.stringify(rates)),
      groupedRates: JSON.parse(JSON.stringify(groupedRates)),
      total: rates.length,
    };
  } catch (error) {
    console.error("Error fetching shipping rates:", error);
    return { rates: [], groupedRates: {}, total: 0 };
  }
}

export default async function ShippingPage({ searchParams }: ShippingPageProps) {
  const params = await searchParams;
  const { rates, groupedRates, total } = await getShippingRates(params);

  const states = Object.keys(groupedRates).sort();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-xl">Shipping Rates</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Configure shipping rates by location ({total} rates)
          </p>
        </div>
        <Link href="/admin/shipping/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Rate
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total Rates</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">{states.length}</p>
              <p className="text-xs text-muted-foreground">States Covered</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stb-success">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {rates.length > 0
                  ? `₹${Math.min(...rates.map((r: { rate: number }) => r.rate))}`
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Min Rate</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {rates.length > 0
                  ? `${Math.min(...rates.map((r: { estimatedDays: number }) => r.estimatedDays))}-${Math.max(...rates.map((r: { estimatedDays: number }) => r.estimatedDays))}`
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Days Range</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ShippingFilters
        search={params.search as string | undefined}
        status={params.status as string | undefined}
      />

      {/* Shipping Rates by State */}
      {states.length > 0 ? (
        <div className="space-y-6">
          {states.map((state) => {
            const stateRates = groupedRates[state] || [];

            return (
              <div
                key={state}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <h2 className="heading-md">{state}</h2>
                    <Badge variant="secondary">
                      {stateRates.length} {stateRates.length === 1 ? "rate" : "rates"}
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                          City / Pincode
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                          Rate
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                          Free Above
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                          Est. Days
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stateRates.map((rate: {
                        _id: string;
                        name: string;
                        city?: string;
                        pincode?: string;
                        rate: number;
                        freeAbove?: number;
                        estimatedDays: number;
                        isActive: boolean;
                      }) => (
                        <tr key={rate._id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{rate.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {rate.city && <span>{rate.city}</span>}
                            {rate.city && rate.pincode && <span> - </span>}
                            {rate.pincode && (
                              <span className="font-mono">{rate.pincode}</span>
                            )}
                            {!rate.city && !rate.pincode && <span>All cities</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            ₹{rate.rate.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {rate.freeAbove ? (
                              <span className="text-stb-success">
                                ₹{rate.freeAbove.toLocaleString("en-IN")}+
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary">
                              {rate.estimatedDays} {rate.estimatedDays === 1 ? "day" : "days"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant={rate.isActive ? "default" : "secondary"}
                              className={
                                rate.isActive
                                  ? "bg-stb-success/10 text-stb-success"
                                  : "bg-destructive/10 text-destructive"
                              }
                            >
                              {rate.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/shipping/${rate._id}/edit`}
                                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <DeleteShippingRateButton
                                rateId={rate._id}
                                rateName={rate.name}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12 text-center shadow-sm">
          <Truck className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No shipping rates yet</p>
          <p className="mt-1 text-muted-foreground">
            Add shipping rates to start accepting orders
          </p>
          <Link href="/admin/shipping/new" className="mt-4">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Rate
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
