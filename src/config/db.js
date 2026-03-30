const mongoose = require("mongoose");

const connectDB = async () => {
  try {
   
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    console.log("📡 Connecting to MongoDB Atlas...");

    await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected:`);
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
