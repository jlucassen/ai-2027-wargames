import { emit } from "@tauri-apps/api/event";
import { addMonths, format, subMonths } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { type Data } from "./dataSchema";

function MainWindow() {
  const [headers, setHeaders] = useState<string[]>([
    "AI Speedup 1",
    "AI Speedup 2",
  ]);
  const [rows, setRows] = useState<
    { date: string; values: Record<string, number> }[]
  >([
    {
      date: format(new Date(), "yyyy-MM-dd"),
      values: { "AI Speedup 1": 1.2, "AI Speedup 2": 1.5 },
    },
  ]);

  const addRow = () => {
    // Set new row's date to 3 months after the last row
    const lastRowDate = new Date(rows[rows.length - 1].date);
    const newDate = addMonths(lastRowDate, 3);

    setRows([
      ...rows,
      {
        date: format(newDate, "yyyy-MM-dd"),
        values: Object.fromEntries(headers.map((header) => [header, 1.0])),
      },
    ]);
  };

  const addColumn = () => {
    const newHeader = `AI Speedup ${headers.length + 1}`;
    setHeaders([...headers, newHeader]);
    setRows(
      rows.map((row) => ({
        ...row,
        values: { ...row.values, [newHeader]: 1.0 },
      }))
    );
  };

  const removeColumn = (headerToRemove: string) => {
    if (headers.length <= 1) {
      alert("You must have at least one column");
      return;
    }

    setHeaders(headers.filter((header) => header !== headerToRemove));
    setRows(
      rows.map((row) => {
        const newValues = { ...row.values };
        delete newValues[headerToRemove];
        return { ...row, values: newValues };
      })
    );
  };

  const updateHeader = (oldHeader: string, newHeader: string) => {
    if (newHeader.trim() === "" || headers.includes(newHeader)) return;

    setHeaders(
      headers.map((header) => (header === oldHeader ? newHeader : header))
    );
    setRows(
      rows.map((row) => {
        const newValues = { ...row.values };
        newValues[newHeader] = newValues[oldHeader];
        delete newValues[oldHeader];
        return { ...row, values: newValues };
      })
    );
  };

  const incrementMonth = (rowIndex: number) => {
    const currentDate = new Date(rows[rowIndex].date);
    const newDate = addMonths(currentDate, 1);

    const newRows = [...rows];
    newRows[rowIndex].date = format(newDate, "yyyy-MM-dd");
    setRows(newRows);
  };

  const decrementMonth = (rowIndex: number) => {
    const currentDate = new Date(rows[rowIndex].date);
    const newDate = subMonths(currentDate, 1);

    const newRows = [...rows];
    newRows[rowIndex].date = format(newDate, "yyyy-MM-dd");
    setRows(newRows);
  };

  const updateValue = (rowIndex: number, header: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newRows = [...rows];
    newRows[rowIndex].values[header] = numValue;
    setRows(newRows);
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) {
      alert("You must have at least one row");
      return;
    }

    setRows(rows.filter((_, index) => index !== rowIndex));
  };

  useEffect(() => {
    const data: Data = { headers, rows };
    emit("data", data);
  }, [headers, rows]);

  return (
    <Card className="w-full max-w-6xl mx-auto mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI R&D Speedup Data</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addColumn}>
            <Plus className="mr-2 h-4 w-4" /> Add Column
          </Button>
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-2 h-4 w-4" /> Add Row
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Date</TableHead>
                {headers.map((header, index) => (
                  <TableHead key={index}>
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-8"
                        value={header}
                        onChange={(e) => updateHeader(header, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeColumn(header)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => decrementMonth(rowIndex)}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <CalendarIcon className="inline-block mr-1 h-4 w-4" />
                        {format(new Date(row.date), "MMM yyyy")}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => incrementMonth(rowIndex)}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  {headers.map((header, index) => (
                    <TableCell key={index}>
                      <Input
                        type="number"
                        step="0.1"
                        value={row.values[header] || 0}
                        onChange={(e) =>
                          updateValue(rowIndex, header, e.target.value)
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(rowIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default MainWindow;
