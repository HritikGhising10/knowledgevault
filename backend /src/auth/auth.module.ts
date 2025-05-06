import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  controllers: [AuthController],
  imports: [PrismaModule,
    LoggerModule,
    JwtModule.register({
      global: true,
      secret: "supersecretkey"
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule { }
