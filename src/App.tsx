import Growatt from "./components/growatt/Growatt";
import Octopus from "./components/octopus/Octopus";
import TriggerUpdate from "./components/TriggerUpdate";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-white">
          ⚡ Energy Dashboard
        </h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <TriggerUpdate />
        <Octopus />
        <Growatt />
      </main>
    </div>
  );
};

export default App;
