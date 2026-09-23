import mongoose from "mongoose";
import { mongoUri } from "./config";

let connectPromise: Promise<typeof mongoose> | null = null;

export function connectMongo(): Promise<typeof mongoose> {
  const uri = mongoUri(process.env);
  if (!uri) {
    return Promise.reject(new Error("MONGODB_URI must be set"));
  }
  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose.connect(uri, {
      dbName: "nearbuy",
      serverSelectionTimeoutMS: 10_000,
    });
  }
  return connectPromise;
}

export { mongoose };
