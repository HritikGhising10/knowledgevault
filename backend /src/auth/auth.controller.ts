import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO, SignupDTO } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {

  }
  @Post('login')
  async login(
    @Body() loginDTO: LoginDTO
  ) {
    return this.authService.login(loginDTO);
  }



  @Post('register')
  async register(
    @Body() signupdto: SignupDTO
  ) {
    return this.authService.register(signupdto);
  }
}
