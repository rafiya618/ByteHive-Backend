import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 8000;
export const LISTEN_IP = process.env.LISTEN_IP || "0.0.0.0";
export const ANNOUNCED_IP = process.env.ANNOUNCED_IP || "127.0.0.1"; // change to public IP in prod