import { Module } from "@nestjs/common";
import { ProgramController } from "./program.controller";
import { ProgramService } from "./program.service";
import { PrismaModule } from "prisma/prisma.module";
import { LoggerModule } from "src/logger/logger.module";

@Module({
    imports: [PrismaModule, LoggerModule],
    controllers: [ProgramController],
    providers: [ProgramService],
    exports: [],
})
export class ProgramsModule { }