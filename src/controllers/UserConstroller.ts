import type { Request, Response } from "express";
import { UserService } from "../services/UserService";
import type { ApiResponse, UserData } from "../types/userTypes";
import type { User } from "../generated/prisma/client";

export class UserConstroller {
    private userService : UserService;

    constructor(){
        this.userService = new UserService();
    }

    public createUser = async(req: Request<{}, {}, UserData>, res: Response<ApiResponse<User>>): Promise<void> => {
        try{
            const {username, email, password} = req.body;
            if(!username || !email || !password){
                res.status(400).json({
                    success: false,
                    error: "Username and Email are required"
                })
                return;
            }
            const newUser = await this.userService.createUser({
                username,
                email,
                password,
            })
            res.status(200).json({
                success: true,
                data: newUser,
            })
        }catch(error){
            const message = error instanceof Error ? error.message : 'Unknown error';
            // 409 Conflict is standard for duplicate resources
            res.status(409).json({ success: false, error: message });
        }
    }   


}