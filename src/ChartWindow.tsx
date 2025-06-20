import { format, parseISO } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type Data } from "./dataSchema";

// Use direct hex colors to ensure compatibility
const CHART_COLORS = [
  "#2e7d32", // Green
  "#1976d2", // Blue
  "#5e35b1", // Purple
  "#d81b60", // Pink
  "#ef6c00", // Orange
  "#f9a825", // Yellow
  "#424242", // Grey
  "#6a1b9a", // Deep Purple
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

  // Shorter format for better readability
  const label = CUSTOM_Y_LABELS[roundedValue as keyof typeof CUSTOM_Y_LABELS];
  
  if (label) {
    return `${roundedValue}x — ${label}`;
  } else {
    return `${roundedValue}x`;
  }
};

interface ChartWindowProps {
  data: Data;
  onDataUpdate?: (updatedData: Data) => void;
}

function ChartWindow({ data, onDataUpdate }: ChartWindowProps) {
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState<{
    header: string;
    dataIndex: number;
    initialY: number;
    initialValue: number;
    chartRect: DOMRect;
  } | null>(null);
  const [localData, setLocalData] = useState<Data>(data);

  // Update local data when props change
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const chartData = useMemo(() => {
    if (!localData) return [];

    try {
      const sortedRows = [...localData.rows]
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
      return [];
    }
  }, [localData]);

  // Check if dark mode is active
  const isDarkMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  const xDomain = useMemo(() => {
    if (!localData || localData.rows.length === 0) return [];
    return [
      parseISO(localData.rows[0].date).getTime(),
      parseISO(localData.rows[localData.rows.length - 1].date).getTime(),
    ];
  }, [localData]);

  const ticks = useMemo(() => {
    if (!localData || localData.rows.length === 0) return [];
    return localData.rows.map((row) => parseISO(row.date).getTime());
  }, [localData]);

  if (!localData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>No data available</p>
      </div>
    );
  }

  // Handle clicks outside tooltip to dismiss it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't dismiss if clicking on a dot
      if (target.closest('.recharts-dot')) {
        return;
      }
      
      // Don't dismiss if clicking inside the tooltip
      if (tooltipRef.current && tooltipRef.current.contains(target)) {
        return;
      }
      
      // Dismiss tooltip for any other clicks
      setTooltipData(null);
      setTooltipPosition(null);
    };

    if (tooltipData) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [tooltipData]);

  // Mouse event handlers for dragging
  const handleMouseDown = (header: string, dataIndex: number, event: any, value: number) => {
    if (event && event.target && chartRef.current) {
      // Find the SVG element for accurate coordinate mapping
      const svgElement = chartRef.current.querySelector('svg');
      const chartRect = svgElement ? svgElement.getBoundingClientRect() : chartRef.current.getBoundingClientRect();
      
      setIsDragging(true);
      setDragData({
        header,
        dataIndex,
        initialY: event.clientY,
        initialValue: value,
        chartRect
      });
      // Prevent tooltip from showing during drag
      setTooltipData(null);
      setTooltipPosition(null);
    }
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !dragData || !chartRef.current) return;

    // Find the SVG and get the actual plotting area
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    // Get SVG coordinate system
    const svgPoint = svgElement.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const svgCoords = svgPoint.matrixTransform(svgElement.getScreenCTM()?.inverse());

    // Get the chart's actual dimensions
    const chartHeight = window.innerHeight - 150;
    const margin = { top: 30, bottom: 50, left: 40, right: 200 };
    
    // Calculate plot area bounds
    const plotTop = margin.top;
    const plotBottom = chartHeight - margin.bottom;
    const plotHeight = plotBottom - plotTop;
    
    // Map SVG Y coordinate to value range
    if (svgCoords.y >= plotTop && svgCoords.y <= plotBottom) {
      const relativeY = (plotBottom - svgCoords.y) / plotHeight; // 0 at bottom, 1 at top
      
      // Use the same domain as the YAxis
      const minTransformedValue = applyLogTransform(1);
      const maxTransformedValue = applyLogTransform(2000);
      const targetTransformedValue = minTransformedValue + (relativeY * (maxTransformedValue - minTransformedValue));
      const newValue = Math.max(1, Math.min(2000, reverseLogTransform(targetTransformedValue)));

      // Update local data
      const updatedData = { ...localData };
      updatedData.rows[dragData.dataIndex].values[dragData.header] = newValue;
      setLocalData(updatedData);
    }
  }, [isDragging, dragData, localData]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragData && onDataUpdate) {
      // Propagate changes to parent
      onDataUpdate(localData);
    }
    setIsDragging(false);
    setDragData(null);
  }, [isDragging, dragData, localData, onDataUpdate]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDotClick = (data: any, event: any) => {
    // Don't show tooltip if we just finished dragging
    if (isDragging) return;
    
    console.log('Dot clicked:', data, event); // Debug log
    
    if (event && event.target) {
      const rect = event.target.getBoundingClientRect();
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      
      setTooltipPosition({
        x: rect.left + scrollX + rect.width / 2,
        y: rect.top + scrollY - 10
      });
      
      // Create payload for all data series at this point
      const payload = data.headers.map((header: string, index: number) => ({
        name: header,
        value: data[header],
        color: CHART_COLORS[index % CHART_COLORS.length]
      })).filter((item: any) => typeof item.value === 'number' && item.value !== undefined);
      
      console.log('Setting tooltip data:', { label: data.timestamp, payload }); // Debug log
      
      setTooltipData({
        label: data.timestamp,
        payload: payload
      });
    }
  };

  const CustomTooltipContent = () => {
    if (!tooltipData || !tooltipData.payload || !tooltipData.payload.length) {
      return null;
    }

    const formattedLabel =
      typeof tooltipData.label === "number" ? format(new Date(tooltipData.label), "MMMM yyyy") : tooltipData.label;

    return (
      <div 
        ref={tooltipRef}
        className={`absolute z-50 rounded-lg border p-4 shadow-lg pointer-events-auto ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'}`}
        style={{
          left: tooltipPosition?.x,
          top: tooltipPosition?.y,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="font-bold text-lg border-b pb-2 mb-1">
            {formattedLabel}
          </div>
          <div className="flex flex-col gap-3">
            {tooltipData.payload.map((entry: any, index: number) => {
              const value = entry.value;
              const name = entry.name;

              const transformedValue = typeof value === "number" ? reverseLogTransform(value) : value;
              const roundedValue = typeof transformedValue === "number" ? Math.round(transformedValue * 100) / 100 : transformedValue;
              const displayValue = typeof roundedValue === "number" 
                ? (roundedValue % 1 === 0 ? roundedValue.toString() : roundedValue.toFixed(2))
                : roundedValue;
                  
              // Look up the label if it exists
              const label = CUSTOM_Y_LABELS[Math.round(reverseLogTransform(value) * 100) / 100 as keyof typeof CUSTOM_Y_LABELS];
              const description = label ? ` — ${label}` : '';

              return (
                <div key={`item-${index}`} className="flex items-center gap-3 py-1">
                  <span
                    className="h-5 w-5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-lg font-medium flex-shrink-0">{name}</span>
                  <span className="text-lg ml-auto font-bold">
                    {displayValue}x{description}
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
    <div ref={chartRef} className="relative">
      <Card className="w-full h-[calc(100vh-120px)] mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">AI 2027 Tabletop Exercise - R&D Progress Multiplier</CardTitle>
        <CardDescription className="text-lg">
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
      <CardContent className="h-[calc(100%-80px)] p-2">
        <div className="w-full h-full flex justify-center">
          <LineChart
            width={window.innerWidth > 1200 ? window.innerWidth - 150 : window.innerWidth - 50}
            height={window.innerHeight - 150}
            data={chartData}
            margin={{
              left: 40,
              right: 200, // Increased right margin for legend
              top: 30,
              bottom: 50, // More space for X-axis labels
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
              tickMargin={12}
              style={{
                fontSize: '18px',
                fontWeight: 500
              }}
              allowDataOverflow
            />
            <YAxis
              scale="log"
              domain={[1, "auto"]}
              ticks={TRANSFORMED_Y_TICKS}
              tickFormatter={formatYAxisTick}
              tickMargin={15}
              width={260}
              style={{
                fontSize: '18px',
                fontWeight: 500
              }}
              allowDataOverflow
            />
            <Legend 
              layout="vertical"
              align="right" 
              verticalAlign="middle"
              iconSize={16}
              wrapperStyle={{ 
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                border: isDarkMode ? '1px solid #333' : '1px solid #f0f0f0',
                borderRadius: '8px',
                padding: '20px',
                lineHeight: '40px',
                fontSize: '18px',
                fontWeight: 500,
                color: isDarkMode ? '#fff' : '#000',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              // Sort payload to match the line order from top to bottom at the right edge
              formatter={(value) => {
                return <span style={{ fontSize: '20px', color: isDarkMode ? '#fff' : '#000' }}>{value}</span>;
              }}
              payload={chartData.length > 0 
                ? localData.headers
                  // Sort by the last data point values in descending order
                  .map(header => ({
                    value: header,
                    type: 'line' as const,
                    color: CHART_COLORS[localData.headers.indexOf(header) % CHART_COLORS.length],
                    dataValue: reverseLogTransform((chartData[chartData.length - 1] as any)[header] || 0)
                  }))
                  .sort((a, b) => b.dataValue - a.dataValue)
                : []
              }
            />
            {localData.headers.map((header, index) => (
              <Line
                key={header}
                dataKey={header}
                type="monotone"
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={3}
                dot={{ 
                  r: 5, 
                  fill: CHART_COLORS[index % CHART_COLORS.length], 
                  strokeWidth: 0,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  onMouseDown: (data: any, event: any) => {
                    const dataIndex = chartData.findIndex(row => row.timestamp === data.payload.timestamp);
                    if (dataIndex !== -1) {
                      handleMouseDown(header, dataIndex, event, data.payload[header]);
                    }
                  },
                  onClick: (data: any, event: any) => {
                    const enrichedData = { ...data.payload, headers: localData.headers };
                    handleDotClick(enrichedData, event);
                  }
                }}
                activeDot={{ 
                  r: 8, 
                  fill: CHART_COLORS[index % CHART_COLORS.length], 
                  strokeWidth: 0,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  onMouseDown: (data: any, event: any) => {
                    const dataIndex = chartData.findIndex(row => row.timestamp === data.payload.timestamp);
                    if (dataIndex !== -1) {
                      handleMouseDown(header, dataIndex, event, data.payload[header]);
                    }
                  },
                  onClick: (data: any, event: any) => {
                    const enrichedData = { ...data.payload, headers: localData.headers };
                    handleDotClick(enrichedData, event);
                  }
                }}
                isAnimationActive={!isDragging}
                animationDuration={500}
              />
            ))}
          </LineChart>
        </div>
      </CardContent>
      {tooltipData && tooltipPosition && <CustomTooltipContent />}
    </Card>
    </div>
  );
}

export default ChartWindow;