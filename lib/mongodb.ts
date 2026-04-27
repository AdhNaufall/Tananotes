import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable.');
  }
  return uri;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

let cached = globalWithMongoose.mongoose;

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = getMongoUri();
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};