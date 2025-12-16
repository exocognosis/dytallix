import { Controller, Post, Get, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
      lastLoginAt: req.user.lastLoginAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '');
    return this.authService.logout(token);
  }
}
