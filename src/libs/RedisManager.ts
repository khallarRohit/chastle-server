import { createClient, type RedisClientType } from 'redis';
import 'dotenv/config';

export class RedisManager {
    private static instance: RedisManager;
    public client: RedisClientType;

    private constructor(){
        this.client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        })

        this.client.on('error', (err) => console.error('Redis Client Error', err));
        this.client.on('connect', () => console.log('Redis connecting...'));
        this.client.on('ready', () => console.log('Redis is ready and connected.'));
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public async connect(): Promise<void> {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }

    public async disconnect(): Promise<void> {
        if (this.client.isOpen) {
            await this.client.quit();
        }
    }

    public async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
        await this.client.set(key, value, { EX: ttlSeconds });
    }

    public async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }
}