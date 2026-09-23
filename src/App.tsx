import Growatt from "./components/growatt/Growatt";
import Octopus from "./components/octopus/Octopus";
import TriggerUpdate from "./components/TriggerUpdate";

function App() {
  return (
    <div className="App">
      <TriggerUpdate />
      <Growatt />
      <Octopus />
    </div>
  );
}

export default App;
