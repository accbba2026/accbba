// app/api/test/route.js
import { connectToDatabase, MONGODB_URI } from "@/app/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();
  let connection = null;

  try {
    console.log('🧪 Testing database connection...');
    
    // Use the shared connection function
    connection = await connectToDatabase();
    
    const duration = Date.now() - startTime;

    // Get connection info safely
    const connectionInfo = {
      readyState: connection.connection.readyState,
      readyStateName: getConnectionState(connection.connection.readyState),
      databaseName: connection.connection.name,
      host: connection.connection.host || 'unknown',
    };

    return NextResponse.json({
      success: true,
      message: "✅ Database connection successful!",
      duration: `${duration}ms`,
      connection: connectionInfo,
      connectionString: MONGODB_URI.replace(/FJNwWXffYlStMK6f/, '********'),
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Test connection error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: "❌ Database connection failed",
        duration: `${duration}ms`,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
        },
        troubleshooting: {
          currentIP: "120.89.66.49",
          expectedShards: [
            "ac-dcmut4m-shard-00-00.n9oqjau.mongodb.net",
            "ac-dcmut4m-shard-00-01.n9oqjau.mongodb.net",
            "ac-dcmut4m-shard-00-02.n9oqjau.mongodb.net"
          ],
          replicaSet: "atlas-fegf08-shard-0",
          note: "Make sure your hosts file has entries for ac-dcmut4m shards",
          hostsFileCheck: "C:\\Windows\\System32\\drivers\\etc\\hosts should contain: 89.192.8.235 ac-dcmut4m-shard-00-00.n9oqjau.mongodb.net"
        },
      },
      { status: 500 },
    );
  }
}

function getConnectionState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}