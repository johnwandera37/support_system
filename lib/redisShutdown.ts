// This script is responsible for shutting down redis when the app is shutdown

import { getErrorMessage } from "@/utils/errMsg";
import { getRedisClient } from "./redis";

const shutdown = async () => {
  let client;

  try {
    client = await getRedisClient();

    if (client.isOpen) {
      await client.quit();
      console.log('🛑 Redis connection closed.');
    } else {
      console.log('ℹ️ Redis was not open. No action taken.');
    }
  } catch (err) {
    console.error('❌ Failed during Redis shutdown:', getErrorMessage(err));
    process.exit(1);
  }
};

shutdown();

