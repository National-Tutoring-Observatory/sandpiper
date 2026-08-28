import mongoose from "mongoose";
import path from "path";

interface DatabaseConnection {
  connection: mongoose.Connection;
  models: mongoose.Models;
}

let CONNECTION: DatabaseConnection | undefined;

async function getDatabaseConnection(): Promise<DatabaseConnection> {
  const {
    DOCUMENT_DB_CONNECTION_STRING,
    DOCUMENT_DB_USERNAME,
    DOCUMENT_DB_PASSWORD,
    DOCUMENT_DB_LOCAL,
  } = process.env;

  if (!DOCUMENT_DB_CONNECTION_STRING) {
    throw new Error("DOCUMENT_DB_CONNECTION_STRING is undefined.");
  }

  if (!DOCUMENT_DB_USERNAME) {
    throw new Error("DOCUMENT_DB_USERNAME is undefined.");
  }

  if (!DOCUMENT_DB_PASSWORD) {
    throw new Error("DOCUMENT_DB_PASSWORD is undefined.");
  }

  const isAtlasConnection =
    DOCUMENT_DB_CONNECTION_STRING.includes("mongodb.net");
  const scheme = isAtlasConnection ? "mongodb+srv" : "mongodb";
  const connectionString = `${scheme}://${encodeURIComponent(DOCUMENT_DB_USERNAME)}:${encodeURIComponent(DOCUMENT_DB_PASSWORD)}@${DOCUMENT_DB_CONNECTION_STRING}`;

  if (!CONNECTION) {
    const connectionOptions: mongoose.ConnectOptions = {
      connectTimeoutMS: 10000,
    };

    const isLocalConnection =
      DOCUMENT_DB_LOCAL === "true" ||
      DOCUMENT_DB_CONNECTION_STRING.includes("localhost") ||
      DOCUMENT_DB_CONNECTION_STRING.includes("127.0.0.1");

    // Atlas uses mongodb+srv:// with its own public-CA TLS; the AWS
    // DocumentDB CA bundle below only applies to that AWS-specific path.
    if (!isLocalConnection && !isAtlasConnection) {
      connectionOptions.tls = true;
      connectionOptions.tlsCAFile = path.join(
        process.cwd(),
        "global-bundle.pem",
      );
    }

    const connection = await mongoose.connect(
      connectionString,
      connectionOptions,
    );
    CONNECTION = connection;
    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });
  }

  return CONNECTION;
}

export async function initializeDatabase() {
  try {
    await getDatabaseConnection();
    console.log("Database connection initialized");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export default getDatabaseConnection;
