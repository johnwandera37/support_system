//Because Next.js App Router (app/) doesn't support WebSocket upgrades.
// WebSockets (like Socket.IO) need persistent connections, which App Router routes
//  cannot guarantee. pages/api still supports that.

// Ref code
// import { log } from "@/utils/logger";
// import { Server } from "socket.io";

// export default function handler(req: any, res: any) {
//   if (!res.socket.server.io) {
//     const io = new Server(res.socket.server);
//     io.on("connection", socket => {
//       log("User connected");

//       socket.on("create-ticket", data => {
//         io.emit("new-ticket", data); // broadcast
//       });

//       socket.on("update-ticket", data => {
//         io.emit("ticket-updated", data);
//       });
//     });
//     res.socket.server.io = io;
//   }

//   res.end();
// }

//Ref code
// in front end
// const socket = io();

// socket.emit("create-ticket", ticketData);
// socket.on("new-ticket", ticket => {
//   // display real-time ticket
// });



// const io = new SocketIOServer(res.socket.server)
// // I'd eventually run Socket.IO in its own Node server.
// Later you'll probably have events like:
// ticket-message
// typing
// user-online
// agent-online
// ticket-assigned
// ticket-closed
// ticket-reopened
// notification

import { Server as SocketIOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket } from "net";
import { log, warnLog } from "@/utils/logger";

// Extend Next.js types to add a custom `io` property on the server
type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
};

// Tell Next.js not to parse the request body (because WebSocket doesn't use a body)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Main API route handler
export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Only initialize once (Hot Reload protection in dev)
  if (!res.socket.server.io) {
    log("🟢 New Socket.IO server being created...");

    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket", //this is overriding the default /socket.io for better controls, tells Socket.IO to listen connection on /api/socket
      addTrailingSlash: false, // prevents mismatch /api/socket/ vs /api/socket.
    });
    //Clients must connect to http://yourdomain.com/api/socket.
    //avoid conflicts incase another tool uses  the default /socket.io, Clarity & Convention next js uses /api/* and Better control

    // Attach to server object so it persists
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("✅ Client connected:", socket.id);

      // Set up custom event listeners
      // 1. create ticket
      socket.on("create-ticket", (data) => {
        log("📨 Received create-ticket:", data);
        io.emit("new-ticket", data); // Broadcast to all clients
      });

      //2. update ticket
      socket.on("update-ticket", (data) => {
        log("📨 Received update-ticket:", data);
        io.emit("ticket-updated", data); // Broadcast to all clients
      });

      // 3. delete tickets
      socket.on("delete-ticket", (ticketId) => {
        log("🗑️ Received delete-ticket:", ticketId);
        io.emit("ticket-deleted", ticketId);
      });

      socket.on("disconnect", () => {
        log("❌ Client disconnected:", socket.id);
      });
    });
  } else {
    warnLog("⚠️ Socket.IO server already running");
  }

  res.end();
}
