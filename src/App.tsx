import { getCurrentWindow } from "@tauri-apps/api/window";
import ChartWindow from "./ChartWindow";
import MainWindow from "./MainWindow";

function App() {
  const windowLabel = getCurrentWindow().label;

  if (windowLabel === "chart") {
    return <ChartWindow />;
  }

  return <MainWindow />;
}

export default App;
