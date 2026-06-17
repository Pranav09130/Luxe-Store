// db/db.js — MongoDB connection via Mongoose
const mongoose = require("mongoose");

const connect = async () => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/luxe_store";
  await mongoose.connect(uri);
  console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
};

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

module.exports = connect;
