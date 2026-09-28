import { periodsHandler } from "../_handlers/growatt/periods";
import { createRouter } from "../_lib/router";

// Reading or writing the inverter takes 5–30s.
export const maxDuration = 60;

// /api/growatt/<action>. The code is in api/_handlers/growatt/.
export default createRouter({
  charge: periodsHandler("charge"),
  discharge: periodsHandler("discharge"),
});
