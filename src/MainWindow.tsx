import { emit } from "@tauri-apps/api/event";
import { message, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { addMonths, format, subMonths } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ZodError } from "zod/v4";
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
import { dataSchema, type Data } from "./dataSchema";

function MainWindow() {
  const [headers, setHeaders] = useState<string[]>(["OpenAI", "GDM/Anthropic"]);
  const [rows, setRows] = useState<
    { date: string; values: Record<string, number>; hidden: boolean }[]
  >([
    {
      date: "2027-10-14",
      values: { OpenAI: 1.2, "GDM/Anthropic": 1.5 },
      hidden: false,
    },
  ]);

  const saveDataToFile = async () => {
    try {
      const dataToSave: Data = {
        headers,
        rows: rows.map(({ date, values, hidden }) => ({
          date,
          values,
          hidden,
        })),
      };

      // Validate the data before saving
      try {
        dataSchema.parse(dataToSave);
      } catch (error) {
        if (error instanceof ZodError) {
          const errorMessage = error.issues
            .map((err) => `${err.path.join(".")}: ${err.message}`)
            .join("\n");

          await message(`Cannot save invalid data:\n${errorMessage}`, {
            title: "Validation Error",
            kind: "error",
          });
          return;
        }
        throw error;
      }

      const filePath = await save({
        filters: [
          {
            name: "JSON",
            extensions: ["json"],
          },
        ],
        defaultPath: "ai-progress-data.json",
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(dataToSave, null, 2));
        await message("File saved successfully", {
          title: "Success",
          kind: "info",
        });
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      await message(
        `Failed to save file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Save Error",
          kind: "error",
        }
      );
    }
  };

  const loadDataFromFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "JSON",
            extensions: ["json"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        const fileContent = await readTextFile(selected);

        let rawData;
        try {
          rawData = JSON.parse(fileContent);
        } catch (parseError) {
          await message("Invalid JSON file format", {
            title: "Load Error",
            kind: "error",
          });
          return;
        }

        const validationResult = dataSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues
            .map((err) => `${err.path.join(".")}: ${err.message}`)
            .join("\n");

          await message(`Invalid data format:\n${errorMessage}`, {
            title: "Validation Error",
            kind: "error",
          });
          return;
        }

        const loadedData = validationResult.data;

        setHeaders(loadedData.headers);

        setRows(
          loadedData.rows.map((row) => ({
            ...row,
            hidden: row.hidden ?? false,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load file:", error);
      await message(
        `Failed to load file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Load Error",
          kind: "error",
        }
      );
    }
  };

  const addRow = () => {
    try {
      if (rows.length === 0) {
        // Handle case with no existing rows
        const today = new Date();
        setRows([
          {
            date: format(today, "yyyy-MM-dd"),
            values: Object.fromEntries(headers.map((header) => [header, 1.0])),
            hidden: false,
          },
        ]);
        return;
      }

      const lastRowDate = new Date(rows[rows.length - 1].date);
      const newDate = addMonths(lastRowDate, 3);

      setRows([
        ...rows,
        {
          date: format(newDate, "yyyy-MM-dd"),
          values: Object.fromEntries(headers.map((header) => [header, 1.0])),
          hidden: true,
        },
      ]);
    } catch (error) {
      console.error("Error adding row:", error);
      message(
        `Error adding row: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const addColumn = () => {
    try {
      const newHeader = `AI Speedup ${headers.length + 1}`;
      setHeaders([...headers, newHeader]);
      setRows(
        rows.map((row) => ({
          ...row,
          values: { ...row.values, [newHeader]: 1.0 },
        }))
      );
    } catch (error) {
      console.error("Error adding column:", error);
      message(
        `Error adding column: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const removeColumn = (headerToRemove: string) => {
    try {
      // Don't allow removing the last column
      if (headers.length <= 1) {
        message("Cannot remove the last column", {
          title: "Error",
          kind: "error",
        });
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
    } catch (error) {
      console.error("Error removing column:", error);
      message(
        `Error removing column: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const updateHeader = (oldHeader: string, newHeader: string) => {
    try {
      if (newHeader.trim() === "") {
        message("Header name cannot be empty", {
          title: "Validation Error",
          kind: "error",
        });
        return;
      }

      if (headers.includes(newHeader) && newHeader !== oldHeader) {
        message("A column with this name already exists", {
          title: "Validation Error",
          kind: "error",
        });
        return;
      }

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
    } catch (error) {
      console.error("Error updating header:", error);
      message(
        `Error updating header: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const incrementMonth = (rowIndex: number) => {
    try {
      const currentDate = new Date(rows[rowIndex].date);
      const newDate = addMonths(currentDate, 1);

      const newRows = [...rows];
      newRows[rowIndex].date = format(newDate, "yyyy-MM-dd");
      setRows(newRows);
    } catch (error) {
      console.error("Error incrementing month:", error);
      message(
        `Error updating date: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const decrementMonth = (rowIndex: number) => {
    try {
      const currentDate = new Date(rows[rowIndex].date);
      const newDate = subMonths(currentDate, 1);

      const newRows = [...rows];
      newRows[rowIndex].date = format(newDate, "yyyy-MM-dd");
      setRows(newRows);
    } catch (error) {
      console.error("Error decrementing month:", error);
      message(
        `Error updating date: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const updateValue = (rowIndex: number, header: string, value: string) => {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        message("Please enter a valid number", {
          title: "Validation Error",
          kind: "error",
        });
        return;
      }

      // Check if the value is positive
      if (numValue <= 0) {
        message("Value must be positive", {
          title: "Validation Error",
          kind: "error",
        });
        return;
      }

      const newRows = [...rows];
      newRows[rowIndex].values[header] = numValue;
      setRows(newRows);
    } catch (error) {
      console.error("Error updating value:", error);
      message(
        `Error updating value: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const removeRow = (rowIndex: number) => {
    try {
      setRows(rows.filter((_, index) => index !== rowIndex));
    } catch (error) {
      console.error("Error removing row:", error);
      message(
        `Error removing row: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  const toggleRowVisibility = (rowIndex: number) => {
    try {
      const newRows = [...rows];
      newRows[rowIndex].hidden = !newRows[rowIndex].hidden;
      setRows(newRows);
    } catch (error) {
      console.error("Error toggling row visibility:", error);
      message(
        `Error toggling visibility: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  };

  useEffect(() => {
    try {
      const visibleRows = rows.filter((row) => !row.hidden);
      const dataToSend: Data = {
        headers,
        rows: visibleRows.map(({ date, values, hidden }) => ({
          date,
          values,
          hidden,
        })),
      };

      emit("data", dataToSend).catch((error) => {
        console.error("Error emitting data event:", error);
        message(
          `Error sending data to chart: ${
            error instanceof Error ? error.message : String(error)
          }`,
          {
            title: "Communication Error",
            kind: "error",
          }
        );
      });
    } catch (error) {
      console.error("Error preparing data for chart:", error);
      message(
        `Error preparing data for chart: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          kind: "error",
        }
      );
    }
  }, [headers, rows]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        // Ctrl+S or Cmd+S (Save)
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          saveDataToFile();
        }
        // Ctrl+O or Cmd+O (Open)
        if ((e.ctrlKey || e.metaKey) && e.key === "o") {
          e.preventDefault();
          loadDataFromFile();
        }
      } catch (error) {
        console.error("Error handling keyboard shortcut:", error);
        message(
          `Error with keyboard shortcut: ${
            error instanceof Error ? error.message : String(error)
          }`,
          {
            title: "Error",
            kind: "error",
          }
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <Card className="w-full max-w-6xl mx-auto mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI R&D Progress Multiplier Data</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveDataToFile}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
          <Button variant="outline" size="sm" onClick={loadDataFromFile}>
            <Upload className="mr-2 h-4 w-4" /> Load
          </Button>
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
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={row.hidden ? "opacity-60" : ""}
                >
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRowVisibility(rowIndex)}
                        title={row.hidden ? "Show row" : "Hide row"}
                      >
                        {row.hidden ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(rowIndex)}
                        title="Delete row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
