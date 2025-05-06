import { Module } from "@nestjs/common";
import { DatafileController } from "./datafile.controller";
import { DatafileService } from "./datafile.service";
import { PrismaModule } from "prisma/prisma.module";
import { LoggerModule } from "src/logger/logger.module";

@Module({
    imports: [PrismaModule, LoggerModule],
    controllers: [DatafileController],
    providers: [DatafileService],
})
export class DatafileModule { }