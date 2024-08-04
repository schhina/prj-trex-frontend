import { io } from 'socket.io-client';

export const socket = io("unusual-vickie-prj-trex-e25f682f.koyeb.app", {
    transports: ["websocket"]
});