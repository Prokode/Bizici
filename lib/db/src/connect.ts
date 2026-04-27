import mongoose from "mongoose";

let connectPromise: Promise<typeof mongoose> | null = null;

export function connectMongo(): Promise<typeof mongoose> {
  if (!process.env.MONGODB_URI) {
    return Promise.reject(new Error("MONGODB_URI must be set"));
  }
  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: "nearbuy",
      serverSelectionTimeoutMS: 10_000,
    });
  }
  return connectPromise;
}

export { mongoose };
