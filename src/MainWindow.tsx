import { addMonths, format, subMonths } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect } from "react";
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
import DEFAULT_DATA from "./default-data.json";
import { FileUpload } from "./components/ui/file-upload";
import { useToast } from "./components/ui/toast";
import { storageService, eventService } from "./lib/utils";

interface MainWindowProps {
  data: Data;
  setData: (data: Data) => void;
}

function MainWindow({ data, setData }: MainWindowProps) {
  const { showToast } = useToast();

  const prepareData = () => {
    return {
      ...data,
      rows: data.rows.map((row) => {
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

  const parseData = (fileContent: string): Data | null => {
    let rawData;
    try {
      rawData = JSON.parse(fileContent);
    } catch (parseError) {
      showToast("Invalid JSON file format", { 
        title: "Load Error", 
        type: "error" 
      });
      return null;
    }
    const validationResult = dataSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      showToast(`Invalid data format: ${errorMessage}`, {
        title: "Validation Error",
        type: "error",
      });
      return null;
    }

    return validationResult.data;
  };

  const applyLoadedData = (loadedData: Data) => {
    setData({
      ...loadedData,
      rows: loadedData.rows.map((row) => ({
        ...row,
        hidden: row.hidden ?? false,
      })),
    });
  };

  // Load cached data on startup
  useEffect(() => {
    const loadCachedData = () => {
      const cachedData = storageService.loadData();
      if (cachedData) {
        applyLoadedData(cachedData);
      }
    };

    loadCachedData();
  }, []);

  const saveDataToFile = () => {
    try {
      const dataToSave = prepareData();
      storageService.downloadJson(dataToSave, "ai-progress-data.json");
      showToast("File saved successfully", {
        title: "Success",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to save file:", error);
      showToast(
        `Failed to save file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Save Error",
          type: "error",
        }
      );
    }
  };

  const handleFileLoad = (fileContent: string) => {
    try {
      const validatedData = parseData(fileContent);
      if (validatedData) {
        applyLoadedData(validatedData);
        showToast("File loaded successfully", {
          title: "Success",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Failed to load file:", error);
      showToast(
        `Failed to load file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Load Error",
          type: "error",
        }
      );
    }
  };

  const resetToDefaultData = () => {
    setData(DEFAULT_DATA);
    showToast("Data reset to default values", {
      title: "Reset",
      type: "info",
    });
  };

  const addRow = () => {
    try {
      if (data.rows.length === 0) {
        const today = new Date("2027-10-14");
        setData({
          ...data,
          rows: [
            {
              date: format(today, "yyyy-MM-dd"),
              values: Object.fromEntries(
                data.headers.map((header) => [header, 1.0])
              ),
              hidden: false,
            },
          ],
        });
        return;
      }

      const lastRowDate = new Date(data.rows[data.rows.length - 1].date);
      const newDate = addMonths(lastRowDate, 3);
      const lastRowValues = data.rows[data.rows.length - 1]?.values;

      setData({
        ...data,
        rows: [
          ...data.rows,
          {
            date: format(newDate, "yyyy-MM-dd"),
            values: { ...lastRowValues },
            hidden: true,
          },
        ],
      });
    } catch (error) {
      console.error("Error adding row:", error);
      showToast(
        `Error adding row: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          title: "Error",
          type: "error",
        }
      );
    }
  };

  const addColumn = () => {
    const newHeader = `Lab ${data.headers.length + 1}`;
    setData({
      headers: [...data.headers, newHeader],
      rows: data.rows.map((row) => ({
        ...row,
        values: { ...row.values, [newHeader]: 1.0 },
      })),
    });
  };

  const removeColumn = (headerToRemove: string) => {
    setData({
      headers: data.headers.filter((header) => header !== headerToRemove),
      rows: data.rows.map((row) => {
        const newValues = { ...row.values };
        delete newValues[headerToRemove];
        return { ...row, values: newValues };
      }),
    });
  };

  const updateHeader = (oldHeader: string, newHeader: string) => {
    if (data.headers.includes(newHeader) && newHeader !== oldHeader) {
      showToast("A column with this name already exists", {
        title: "Validation Error",
        type: "error",
      });
      return;
    }

    setData({
      headers: data.headers.map((header) =>
        header === oldHeader ? newHeader : header
      ),
      rows: data.rows.map((row) => {
        const newValues = { ...row.values };
        newValues[newHeader] = newValues[oldHeader];
        delete newValues[oldHeader];
        return { ...row, values: newValues };
      }),
    });
  };

  const incrementMonth = (rowIndex: number) => {
    const currentDate = new Date(data.rows[rowIndex].date);
    const newDate = addMonths(currentDate, 1);

    const newRows = [...data.rows];
    newRows[rowIndex].date = format(newDate, "yyyy-MM-dd");
    setData({ ...data, rows: newRows });
  };

  const decrementMonth = (rowIndex: number) => {
    const currentDate = new Date(data.rows[rowIndex].date);
    const newDate = subMonths(currentDate, 1);

    const newRows = [...data.rows];
    newRows[rowIndex].date = format(newDate, "yyyy-MM-dd");
    setData({ ...data, rows: newRows });
  };

  const updateValue = (rowIndex: number, header: string, value: string) => {
    const numValue = parseFloat(value);
    const newRows = [...data.rows];
    newRows[rowIndex].values[header] = numValue;
    setData({ ...data, rows: newRows });
  };

  const removeRow = (rowIndex: number) => {
    setData({
      ...data,
      rows: data.rows.filter((_, index) => index !== rowIndex),
    });
  };

  const toggleRowVisibility = (rowIndex: number) => {
    const newRows = [...data.rows];
    newRows[rowIndex].hidden = !newRows[rowIndex].hidden;
    setData({ ...data, rows: newRows });
  };

  // Update storage and emit data updates when data changes
  useEffect(() => {
    const dataToSave = prepareData();
    storageService.saveData(dataToSave);
    eventService.emitDataUpdate(dataToSave);
  }, [data]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        // Ctrl+S or Cmd+S (Save)
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          saveDataToFile();
        }
      } catch (error) {
        console.error("Error handling keyboard shortcut:", error);
        showToast(
          `Error with keyboard shortcut: ${
            error instanceof Error ? error.message : String(error)
          }`,
          {
            title: "Error",
            type: "error",
          }
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [data]);

  return (
    <Card className="w-full max-w-6xl mx-auto mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI 2027 Tabletop Exercise - Data Editor</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveDataToFile}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
          <FileUpload 
            onFileLoaded={handleFileLoad} 
            accept=".json" 
            buttonText="Load"
          />
          <Button variant="outline" size="sm" onClick={resetToDefaultData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reset
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
                {data.headers.map((header, index) => (
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
              {data.rows.map((row, rowIndex) => (
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
                            new Date(data.rows[rowIndex - 1].date)
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
                          rowIndex < data.rows.length - 1 &&
                          new Date(addMonths(new Date(row.date), 1)) >=
                            new Date(data.rows[rowIndex + 1].date)
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  {data.headers.map((header, index) => (
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