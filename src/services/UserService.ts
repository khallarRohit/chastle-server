// This class is responsible for handling all the user related logic to db
import { PrismaClient } from "../generated/prisma/client";
import type { User } from "../generated/prisma/client";
import { Database } from "../libs/db";
import type { UserData } from "../types/userTypes";

export class UserService {
    private prisma: PrismaClient;

    constructor(){
        this.prisma = Database.getInstance().client;
    }

    public createUser = async(userData: UserData): Promise<User> => {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: userData.email }, 
                    { username: userData.username },
                    { passwordHash: userData.password}
                ]
            }
        });

        if(existingUser){
            throw new Error(`User with email or username already exists.`);
        }

        return this.prisma.user.create({
            data: {
                username: userData.username,
                email: userData.email,
                passwordHash: userData.password, 
                role: "PLAYER"
            }
        });
    }

    public getAllUsers = async(): Promise<User[]> => {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        })
    }
}
