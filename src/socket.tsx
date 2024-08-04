import { io } from 'socket.io-client';

export const socket = io("wss://unusual-vickie-prj-trex-e25f682f.koyeb.app", {
    transports: ["websocket"]
    // secure: true
    // cors: {
    //     origin: "unusual-vickie-prj-trex-e25f682f.koyeb.app/"
    // }
});