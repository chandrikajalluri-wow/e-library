import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {});
    console.log('MongoDB Connected');

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB Disconnected!');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB Reconnected!');
    });

  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
