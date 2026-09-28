import Growatt from "../growatt/Growatt";
import Octopus from "../octopus/Octopus";

const DashboardPage = () => (
  <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
    <h1 className="sr-only">Dashboard</h1>
    <Octopus />
    <Growatt />
  </main>
);

export default DashboardPage;
