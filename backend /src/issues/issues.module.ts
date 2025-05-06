import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule { }
