import type { Provider } from "../../types/Api";

// How the settings page talks about each provider. neededFor: what the app
// can't do without it.
const PROVIDERS: Record<
  Provider,
  { name: string; secret: string; neededFor: string }
> = {
  growatt: {
    name: "Growatt",
    secret: "Growatt login",
    neededFor:
      "The app can't read or change your inverter's settings without it",
  },
  octopus: {
    name: "Octopus",
    secret: "Octopus API key",
    neededFor:
      "The app can't see your Octopus slots or saving sessions without it",
  },
};

// Octopus is optional: the app works with Growatt alone. What adding it gives.
const OCTOPUS_BENEFITS =
  "to see your car's charging slots, charge your battery in them automatically and join saving sessions";

export { PROVIDERS, OCTOPUS_BENEFITS };
