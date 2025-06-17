// global.d.ts
//The following gets rid of typescript error when globalThis.io is used
import type { Server as IOServer } from "socket.io";

declare global {
  var io: IOServer | undefined;
}
