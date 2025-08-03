// The following enables the React client to access the events emitted from backend through the socket client(Used on client)
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export function getSocket(): Socket {
  if (!socket) {
    //backend and front end are hosted on same port
    socket = io({
      path: '/api/socket', //Clients must connect to http://yourdomain.com/api/socket.
    });
  }
  return socket;
}
