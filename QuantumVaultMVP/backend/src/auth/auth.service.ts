import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  async login(user: User) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    const token = this.jwtService.sign(payload);
    
    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resource: 'AUTH',
      },
    });

    return {
      access_token: token,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(token: string) {
    await this.prisma.session.deleteMany({
      where: { token },
    });

    return { message: 'Logged out successfully' };
  }

  async validateToken(token: string): Promise<User | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  }

  async getUserFromToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  async createUser(email: string, password: string, role: UserRole = UserRole.VIEWER) {
    const passwordHash = await bcrypt.hash(password, 12);
    
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });
  }
}
