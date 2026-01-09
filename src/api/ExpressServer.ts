import express, { 
    type Application, 
    type Request,
    type Response,
} from "express";
import cors from 'cors';
import helmet from "helmet";
import { UserConstroller } from "../controllers/UserConstroller";

export class ExpressServer {
    public app: Application;
    private port: number;
    private envMode: string;
    private userController : UserConstroller;

    constructor(port: number, mode: string){
        this.app = express();
        this.port = port;
        this.userController = new UserConstroller();
        this.envMode = mode;

        this.configMiddleware();
        this.configRoutes();
    }

    private configMiddleware = (): void => {
        this.app.use(helmet({
            contentSecurityPolicy : this.envMode !== "DEVELOPMENT",
            crossOriginEmbedderPolicy : this.envMode !== "DEVELOPMENT"
        }))
        this.app.use(cors());
        this.app.use(
            express.json(),
            express.urlencoded({extended : true})
        )
    }

    private configRoutes = (): void => {
        // all the routes
        this.app.post("/api/users", this.userController.createUser);
    }

    public start = (): void => {
        this.app.listen(this.port, () => {
            console.log(`Server is up and running at port ${this.port}`);
        })
    }
}