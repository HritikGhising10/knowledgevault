import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { ProcessController } from "./process.controller";
import { ProcessService } from "./process.service";
import { LoggerModule } from "src/logger/logger.module";
import { LoggerService } from "src/logger/logger.service";

@Module({
    imports: [
        PrismaModule,
        LoggerModule
    ],
    controllers: [ProcessController],
    providers: [ProcessService],
})
export class ProcessModule { }