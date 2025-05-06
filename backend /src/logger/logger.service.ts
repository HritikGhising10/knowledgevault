import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class LoggerService {
    constructor(
        private readonly prisma: PrismaService
    ) { }


    async log(message: string, userid: string) {
        try {
            console.log("Logging message", message, userid)
            await this.prisma.logs.create({
                data: {
                    createdAt: new Date(),
                    description: message,
                    user: {
                        connect: {
                            username: userid
                        }
                    }
                }
            })

        } catch (error) {
            console.log("Error while logging", error)
        }

    }
}