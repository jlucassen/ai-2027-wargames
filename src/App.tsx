import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import MainWindow from './MainWindow';
import ChartWindow from './ChartWindow';
import { ToastProvider } from './components/ui/toast';
import { type Data } from './dataSchema';
import DEFAULT_DATA from './default-data.json';

function App() {
  const [data, setData] = useState<Data>(DEFAULT_DATA);
  
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen">
          <header className="bg-primary p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-primary-foreground font-bold text-xl">AI 2027 Tabletop Exercise</h1>
              <nav className="flex gap-4">
                <Link to="/" className="text-primary-foreground hover:underline">Data Editor</Link>
                <Link to="/chart" className="text-primary-foreground hover:underline">Chart View</Link>
              </nav>
            </div>
          </header>
          
          <main className="container mx-auto py-6 px-4">
            <Routes>
              <Route path="/" element={<MainWindow data={data} setData={setData} />} />
              <Route path="/chart" element={<ChartWindow data={data} />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;