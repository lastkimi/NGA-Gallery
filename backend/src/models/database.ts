import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDatabase() {
  try {
    console.log('Connecting to MongoDB at:', config.database.uri);
    await mongoose.connect(config.database.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}
