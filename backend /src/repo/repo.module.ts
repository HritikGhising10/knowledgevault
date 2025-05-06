import { Module } from '@nestjs/common';
import { RepoService } from './repo.service';
import { RepoController } from './repo.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [RepoController],
  providers: [RepoService],
})
export class RepoModule { }
