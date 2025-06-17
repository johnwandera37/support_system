import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } from '@/config/constants';
import { errLog, log } from '@/utils/logger';
import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let idleTimeout: NodeJS.Timeout | null = null;

// Auto-disconnect after 30s of inactivity
const IDLE_DISCONNECT_TIMEOUT = 30000; 

const resetIdleTimer = () => {
  if (idleTimeout) clearTimeout(idleTimeout);
  idleTimeout = setTimeout(async () => {
    if (client && client.isOpen) {
      log('🛑 Closing idle Redis connection...');
      await client.quit();
      client = null;
    }
  }, IDLE_DISCONNECT_TIMEOUT);
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (client && client.isOpen){
      resetIdleTimer(); // Reset timer on reuse
    return client;
  }

  // log(REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME);

if (!REDIS_HOST || !REDIS_PORT || !REDIS_USERNAME || !REDIS_PASSWORD) {
  throw new Error('Redis config is missing required environment variables.');
}

  client = createClient({
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
       reconnectStrategy: (retries) => {
        if (retries > 3) {
          errLog('❌ Max Redis reconnection attempts reached');
          return new Error('Max retries exceeded');
        }
        return Math.min(retries * 100, 5000); // Exponential backoff
      }
    },
  });

  // Event listeners
  client.on('error', (err) => errLog('❌ Redis Client Error:', err));
  client.on('connect', () => log('🔌 Connecting to Redis...'));
  client.on('ready', () => log('✅ Redis is connected and ready.'));
  client.on('end', () => log('🛑 Redis connection closed.'));

  try {
  await client.connect();
  resetIdleTimer(); // Start idle timer after connection
} catch (err) {
  errLog('❌ Failed to connect to Redis:', err);
  client = null; // Ensure cleanup on failed connection
  throw err; // The error will be caught by the function using this client
}

  return client;
};
