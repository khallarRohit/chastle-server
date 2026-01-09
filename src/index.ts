import { Database } from "./libs/db";
import { ExpressServer } from "./api/ExpressServer";
import { RedisManager } from './libs/redisManager';
import 'dotenv/config'

class chessApp {
    private server: ExpressServer;
    private db : Database;
    private port: number;
    private redis: RedisManager;

    constructor() {
        this.db = Database.getInstance();
        this.port = Number(process.env.PORT);
        this.redis = RedisManager.getInstance();
        this.server = new ExpressServer(this.port, process.env.MODE!);
    }

    public async bootstrap() {
        await Promise.all([
            this.db.connect(),
            this.redis.connect()
        ]);

        this.server.start();
    }
}    

const app = new chessApp();
app.bootstrap();