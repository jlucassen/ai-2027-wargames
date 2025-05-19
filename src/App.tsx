import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invoke } from "@tauri-apps/api/core";
import { ChangeEvent, useState } from "react";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Tauri + React + Shadcn/UI</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Enter your name below to receive a greeting
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <div className="flex gap-2">
            <Input
              id="greet-input"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setName(e.currentTarget.value)
              }
              placeholder="Enter your name..."
              className="flex-1"
            />
            <Button type="submit">Greet</Button>
          </div>

          {greetMsg && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="font-medium">{greetMsg}</p>
            </div>
          )}
        </form>

        <div className="pt-6">
          <h2 className="mb-2 text-center text-xl font-semibold">
            Shadcn/UI Button Variants
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
