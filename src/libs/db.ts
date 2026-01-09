// This class is creating the instance of db
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export class Database {
    private static instance: Database;
    public client: PrismaClient;

    private constructor(){
        const connectionString = process.env.DATABASE_URL;
        const adapter = new PrismaPg({connectionString});
        this.client = new PrismaClient({ 
            adapter,
            log: ['query', 'info', 'warn', 'error']
        });
    }

    // Singleton pattern => ensuring only one db instance
    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async connect(): Promise<void>{
        try{
            await this.client.$connect();
            console.log("Database connected successfully.")
        }catch(error){
            console.error("Database connection failed: ", error);
            process.exit(1);
        }
    }

    public async disconnect(): Promise<void>{
        await this.client.$disconnect();
    }

}
