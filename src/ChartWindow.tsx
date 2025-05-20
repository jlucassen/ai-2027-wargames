import { listen } from "@tauri-apps/api/event";
import { message } from "@tauri-apps/plugin-dialog";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { type Data, dataSchema } from "./dataSchema";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

const applyLogTransform = (value: number): number => {
  if (value <= 1) return value;
  return Math.log(value) + 1;
};

const reverseLogTransform = (value: number): number => {
  if (value <= 1) return value;
  return Math.exp(value - 1);
};

const CUSTOM_Y_TICKS = [2, 3, 10, 100, 2000];
const TRANSFORMED_Y_TICKS = CUSTOM_Y_TICKS.map(applyLogTransform);

const CUSTOM_Y_LABELS = {
  2: "Weak Autonomous remote worker",
  3: "Autonomous remote worker",
  10: "Strong autonomous remote worker",
  100: "Superhuman genius",
  2000: "Superintelligence",
};

const formatYAxisTick = (value: number) => {
  const originalValue = reverseLogTransform(value);
  const roundedValue = Math.round(originalValue * 100) / 100;

  return `${roundedValue}x — ${
    CUSTOM_Y_LABELS[roundedValue as keyof typeof CUSTOM_Y_LABELS] ||
    roundedValue
  }`;
};

function ChartWindow() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const unlisten = listen("data", async (event) => {
      try {
        const parsedData = dataSchema.parse(event.payload);
        setData(parsedData);
      } catch (error) {
        console.error("Error parsing data:", error);
        if (error instanceof Error) {
          await message(`Error parsing data: ${error.message}`, {
            title: "Data Error",
            kind: "error",
          });
        }
      }
    });

    return () => {
      unlisten.then((unlisten) => unlisten());
    };
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];

    try {
      const sortedRows = [...data.rows]
        .filter((row) => !row.hidden)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      return sortedRows.map((row) => {
        const transformedValues: Record<string, number | string> = {};

        Object.entries(row.values).forEach(([key, value]) => {
          if (typeof value === "number") {
            transformedValues[key] = applyLogTransform(value);
          } else {
            transformedValues[key] = value;
          }
        });

        const dateObj = parseISO(row.date);
        return {
          date: row.date,
          timestamp: dateObj.getTime(),
          ...transformedValues,
        };
      });
    } catch (error) {
      console.error("Error preparing chart data:", error);
      message(
        `Error preparing chart data: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Chart Error",
          kind: "error",
        }
      );
      return [];
    }
  }, [data]);

  const chartConfig = useMemo(() => {
    if (!data?.headers) return {};

    try {
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
    } catch (error) {
      console.error("Error creating chart config:", error);
      message(
        `Error creating chart configuration: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Chart Config Error",
          kind: "error",
        }
      );
      return {};
    }
  }, [data?.headers]);

  const xDomain = useMemo(() => {
    if (!data || data.rows.length === 0) return [];
    return [
      parseISO(data.rows[0].date).getTime(),
      parseISO(data.rows[data.rows.length - 1].date).getTime(),
    ];
  }, [data]);

  const ticks = useMemo(() => {
    if (!data || data.rows.length === 0) return [];
    return data.rows.map((row) => parseISO(row.date).getTime());
  }, [data]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Waiting for data from main window...</p>
      </div>
    );
  }

  const CustomTooltipContent = (props: any) => {
    const { active, payload, label } = props;

    if (!active || !payload || !payload.length) {
      return null;
    }

    const formattedLabel =
      typeof label === "number" ? format(new Date(label), "MMM yyyy") : label;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="flex gap-2">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              {formattedLabel}
            </span>
          </div>
          <div className="flex flex-col">
            {payload.map((entry: any, index: number) => {
              const value = entry.value;
              const name = entry.name;

              const displayValue =
                typeof value === "number"
                  ? reverseLogTransform(value).toFixed(2)
                  : value;

              return (
                <div key={`item-${index}`} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {displayValue}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle>AI R&D Progress Multiplier Over Time</CardTitle>
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
              dataKey="timestamp"
              type="number"
              domain={xDomain}
              tickFormatter={(timestamp) => {
                return format(new Date(timestamp), "MMM yyyy");
              }}
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDataOverflow
            />
            <YAxis
              scale="log"
              domain={[1, "auto"]}
              ticks={TRANSFORMED_Y_TICKS}
              tickFormatter={formatYAxisTick}
              tickMargin={5}
              width={150}
              allowDataOverflow
            />
            <ChartTooltip cursor={false} content={<CustomTooltipContent />} />
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
    </Card>
  );
}

export default ChartWindow;
