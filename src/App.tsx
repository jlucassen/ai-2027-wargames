import { Button } from "@/components/ui/button";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { z } from "zod";

function App() {
  const windowLabel = getCurrentWindow().label;

  if (windowLabel === "chart") {
    return <Chart />;
  }

  return <Main />;
}

const dataSchema = z.object({
  message: z.string(),
});

type Data = z.infer<typeof dataSchema>;

function Main() {
  return (
    <Button onClick={() => emit("data", { message: "Hello from main" })}>
      Emit Data
    </Button>
  );
}

function Chart() {
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

  return <div>{data?.message}</div>;
}

export default App;
