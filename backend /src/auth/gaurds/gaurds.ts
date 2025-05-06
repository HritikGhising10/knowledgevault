import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService
    ) { }
    async canActivate(
        context: ExecutionContext,
    ): Promise<any> {

        const request = context.switchToHttp().getRequest();
        const headers = request.headers;
        const token = headers?.authorization?.split(' ')[1];
        if (!token) return false
        try {

            let pass = this.jwtService.verify(token)
            if (pass) {
                const user = jwt.decode(token)
                request['user'] = user
                return true
            }

        } catch (error) {
            throw error
        }

    }
}