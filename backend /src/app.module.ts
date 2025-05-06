import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RepoModule } from './repo/repo.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { IssuesModule } from './issues/issues.module';
import { LoggerModule } from './logger/logger.module';
import { DatafileModule } from './datafile/datafile.module';
import { ProgramsModule } from './programs/programs.module';
import { ForumModule } from './forum/forum.module';
import { ProcessModule } from './process/process.module';

@Module({
  imports: [AuthModule, RepoModule, LoggerModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    IssuesModule,
    DatafileModule,
    ProgramsModule,
    ForumModule,
    ProcessModule


  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
