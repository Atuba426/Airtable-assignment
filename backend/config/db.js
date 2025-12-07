import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const uri =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_URI_PROD
        : process.env.MONGO_URI_DEV;

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
