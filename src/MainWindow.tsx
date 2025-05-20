import { emit } from "@tauri-apps/api/event";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { message, open, save } from "@tauri-apps/plugin-dialog";
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
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
  const [headers, setHeaders] = useState<string[]>([
    "OpenAI",
    "GDM/Anthropic",
    "Meta/xAI",
    "CCP",
  ]);
  const [rows, setRows] = useState<Data["rows"]>([
    {
      date: "2027-10-14",
      values: { OpenAI: 2, "GDM/Anthropic": 1, "Meta/xAI": 1, CCP: 2 },
      hidden: false,
    },
    {
      date: "2028-01-14",
      values: { OpenAI: 3, "GDM/Anthropic": 2, "Meta/xAI": 1, CCP: 2.4 },
      hidden: false,
    },
    {
      date: "2028-04-14",
      values: { OpenAI: 10, "GDM/Anthropic": 3, "Meta/xAI": 2, CCP: 3 },
      hidden: false,
    },
    {
      date: "2028-07-14",
      values: { OpenAI: 100, "GDM/Anthropic": 10, "Meta/xAI": 3, CCP: 5.5 },
      hidden: false,
    },
    {
      date: "2028-10-14",
      values: { OpenAI: 2000, "GDM/Anthropic": 100, "Meta/xAI": 10, CCP: 10 },
      hidden: false,
    },
  ]);
  const [cacheFilePath, setCacheFilePath] = useState<string | null>(null);

  const getCacheFilePath = async (): Promise<string> => {
    if (cacheFilePath) return cacheFilePath;

    const appDataDirPath = await appCacheDir();
    console.log("appDataDirPath", appDataDirPath);
    await mkdir(appDataDirPath, { recursive: true });
    return join(appDataDirPath, "ai-progress-data.cache.json");
  };

  const prepareData = () => {
    return {
      headers,
      rows: rows.map((row) => {
        return {
          ...row,
          values: Object.fromEntries(
            Object.entries(row.values).map(([key, value]) => [
              key,
              isNaN(value) ? 0 : value,
            ])
          ),
        };
      }),
    };
  };

  const parseData = async (fileContent: string) => {
    let rawData;
    try {
      rawData = JSON.parse(fileContent);
    } catch (parseError) {
      await message("Invalid JSON file format", {
        title: "Load Error",
        kind: "error",
      });
      return null;
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
      return null;
    }

    return validationResult.data;
  };

  const applyLoadedData = (loadedData: Data) => {
    setHeaders(loadedData.headers);
    setRows(
      loadedData.rows.map((row) => ({
        ...row,
        hidden: row.hidden ?? false,
      }))
    );
  };

  const cacheData = async (data: Data) => {
    try {
      if (!cacheFilePath) {
        const filePath = await getCacheFilePath();
        setCacheFilePath(filePath);
      }

      if (cacheFilePath) {
        await writeTextFile(cacheFilePath, JSON.stringify(data, null, 2), {});
        console.log("Data cached successfully");
      }
    } catch (error) {
      console.error("Failed to cache data:", error);
    }
  };

  // Load cached data on startup
  useEffect(() => {
    const loadCachedData = async () => {
      const filePath = await getCacheFilePath();
      setCacheFilePath(filePath);

      const fileExists = await exists(filePath);
      if (fileExists) {
        const fileContent = await readTextFile(filePath);
        const validatedData = await parseData(fileContent);
        if (validatedData) {
          applyLoadedData(validatedData);
        }
      }
    };

    loadCachedData();
  }, []);

  const saveDataToFile = async () => {
    try {
      const dataToSave = prepareData();

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
        const validatedData = await parseData(fileContent);
        if (validatedData) {
          applyLoadedData(validatedData);
        }
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
      const lastRowValues =
        rows[rows.length - 1]?.values ??
        Object.fromEntries(headers.map((header) => [header, 1.0]));

      setRows([
        ...rows,
        {
          date: format(newDate, "yyyy-MM-dd"),
          values: { ...lastRowValues },
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
    const newHeader = `Lab ${headers.length + 1}`;
    setHeaders([...headers, newHeader]);
    setRows(
      rows.map((row) => ({
        ...row,
        values: { ...row.values, [newHeader]: 1.0 },
      }))
    );
  };

  const removeColumn = (headerToRemove: string) => {
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
    const newRows = [...rows];
    newRows[rowIndex].values[header] = numValue;
    setRows(newRows);
  };

  const removeRow = (rowIndex: number) => {
    setRows(rows.filter((_, index) => index !== rowIndex));
  };

  const toggleRowVisibility = (rowIndex: number) => {
    const newRows = [...rows];
    newRows[rowIndex].hidden = !newRows[rowIndex].hidden;
    setRows(newRows);
  };

  useEffect(() => {
    const dataToSend = prepareData();

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

    cacheData(prepareData());
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
                    <div className="flex items-center">
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
                        disabled={
                          rowIndex > 0 &&
                          new Date(subMonths(new Date(row.date), 1)) <=
                            new Date(rows[rowIndex - 1].date)
                        }
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
                        disabled={
                          rowIndex < rows.length - 1 &&
                          new Date(addMonths(new Date(row.date), 1)) >=
                            new Date(rows[rowIndex + 1].date)
                        }
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
                        min={0}
                        value={row.values[header]}
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
