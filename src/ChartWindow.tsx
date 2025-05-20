import { listen } from "@tauri-apps/api/event";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { type Data, dataSchema } from "./dataSchema";

// Generate colors based on the predefined chart colors in the theme
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Define the chart data type
type ChartDataItem = {
  date: string;
  formattedDate: string;
  [key: string]: string | number; // Allow any string key with string or number values
};

function ChartWindow() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const unlisten = listen("data", (event) => {
      const parsedData = dataSchema.parse(event.payload);
      setData(parsedData);
    });

    return () => {
      unlisten.then((unlisten) => unlisten());
    };
  }, []);

  const chartData = useMemo<ChartDataItem[]>(() => {
    if (!data) return [];

    // Sort rows by date
    const sortedRows = [...data.rows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Transform the data for the chart
    return sortedRows.map((row) => ({
      date: row.date,
      formattedDate: format(parseISO(row.date), "MMM yyyy"),
      ...row.values,
    }));
  }, [data]);

  const chartConfig = useMemo(() => {
    if (!data?.headers) return {};

    // Create config with appropriate colors for each header
    return data.headers.reduce((config, header, index) => {
      const colorIndex = index % CHART_COLORS.length;
      return {
        ...config,
        [header]: {
          label: header,
          color: CHART_COLORS[colorIndex],
        },
      };
    }, {}) as ChartConfig;
  }, [data?.headers]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Waiting for data from main window...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle>AI R&D Speedup Over Time</CardTitle>
        <CardDescription>
          From{" "}
          {chartData.length > 0
            ? format(parseISO(chartData[0].date), "MMMM yyyy")
            : ""}{" "}
          to{" "}
          {chartData.length > 0
            ? format(
                parseISO(chartData[chartData.length - 1].date),
                "MMMM yyyy"
              )
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[400px]">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 20,
              right: 20,
              top: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              label={{
                value: "AI R&D Speedup",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
              domain={["auto", "auto"]}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Legend />
            {data.headers.map((header, index) => (
              <Line
                key={header}
                dataKey={header}
                type="monotone"
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="w-full text-center">Footer text</div>
      </CardFooter>
    </Card>
  );
}

export default ChartWindow;
