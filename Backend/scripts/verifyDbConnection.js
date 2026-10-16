import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// Pure connectivity check — connects, reads connection metadata only
// (database name, ready state, host), touches no collection or document,
// then disconnects. Never logs the URI, username, or password.
async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const conn = mongoose.connection;
    console.log(JSON.stringify({
      status: "connected",
      databaseName: conn.db.databaseName,
      readyState: conn.readyState, // 1 = connected
      host: conn.host,
    }, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.log(JSON.stringify({ status: "failed", error: err.message }, null, 2));
    process.exit(1);
  }
}

run();
