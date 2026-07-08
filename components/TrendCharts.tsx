"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type TrendPoint = { date: string; label: string; revenue: number; occupied: number };

export default function TrendCharts({
  last30,
  last90,
  currency,
}: {
  last30: TrendPoint[];
  last90: TrendPoint[];
  currency: string;
}) {
  const [range, setRange] = useState<"30" | "90">("30");
  const data = range === "30" ? last30 : last90;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        {(["30", "90"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              range === r
                ? "bg-moss text-cream"
                : "text-ink/60 dark:text-cream/60 border border-earth/20 dark:border-cream/20"
            }`}
          >
            Last {r} days
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink/70 dark:text-cream/70 mb-4">Revenue by day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8B5A2B22" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.ceil(data.length / 8)} />
              <YAxis tick={{ fontSize: 11 }} width={50} />
              <Tooltip
                formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#4A7043" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink/70 dark:text-cream/70 mb-4">Occupancy by day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8B5A2B22" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.ceil(data.length / 8)} />
              <YAxis tick={{ fontSize: 11 }} width={40} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(value: number) => [`${value}%`, "Occupied"]} />
              <Area type="stepAfter" dataKey="occupied" stroke="#2E8B8B" fill="#2E8B8B44" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
