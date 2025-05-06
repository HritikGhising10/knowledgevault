import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDTO, SignupDTO } from './dto/auth.dto';
import { PrismaService } from 'prisma/prisma.service';
import { ResponseDTO } from './dto/response.dto';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly jwtService: JwtService,
        private readonly logger: LoggerService
    ) { }
    async login(loginDTO: LoginDTO) {
        const { username, password } = loginDTO
        const user = await this.prismaService.user.findUnique({
            where: {
                username: username,
            }
        })

        if (!user) {
            throw new UnauthorizedException('Invalid username or password')
        }

        if (user.password !== password) {
            throw new UnauthorizedException('Invalid username or password')
        }

        const payload = { username: user.username, sub: user.id }

        const token = this.jwtService.sign(payload)
        return {
            code: 200,
            message: 'Login successful',
            data: {
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    name: user.name,
                }
            }
        }


    }

    async register(signupdto: SignupDTO): Promise<ResponseDTO> {
        try {
            const { name, email, username, password, adminpassword } = signupdto
            if (adminpassword !== "cat12345") {
                throw new UnauthorizedException('Invalid admin password')
            }

            const user = await this.prismaService.user.findUnique({
                where: {
                    email: email,
                }
            })

            if (user) {
                throw new ConflictException('User already exists')
            }

            await this.prismaService.user.create({
                data: {
                    name,
                    email,
                    username,
                    password,
                }
            })

            return {
                code: 200,
                message: 'User created successfully',
            }

        } catch (error) {
            throw error
        }


    }


}
