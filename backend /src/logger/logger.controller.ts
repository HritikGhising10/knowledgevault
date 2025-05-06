import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Controller("logs")
export class LoggerController {
    constructor(
        private readonly prisma: PrismaService
    ) { }


    @Get("all")
    async getAllLogs() {
        return await this.prisma.logs.findMany({
            orderBy: {
                createdAt: "desc"
            },
            include: {
                user: {
                    select: {
                        name: true,
                    }
                }
            }
        });
    }

}