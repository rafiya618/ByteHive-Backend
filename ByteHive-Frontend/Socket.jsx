// This file is only to connect to the gateway
import { io } from "socket.io-client";

// Connect to the gateway (not directly to comment service)
const socket = io("http://localhost:4000"); 

export default socket;


