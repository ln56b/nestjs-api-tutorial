import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as argon from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: AuthDto): Promise<{ access_token: string }> {
    // generate the password hash
    const hash = await argon.hash(dto.password);
    // save the new user

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });

      delete user.hash;
      return this._signToken(user.id, user.email);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException('Email already exists');
      }
      throw Error(error);
    }
  }

  async signin(dto: AuthDto): Promise<{ access_token: string }> {
    // find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // if user does not exist throw exception
    if (!user) throw new ForbiddenException('Invalid credentials');

    // compare password hash
    const match = await argon.verify(user.hash, dto.password);
    // if password does not match throw exception
    if (!match) throw new ForbiddenException('Invalid credentials');
    // return user
    delete user.hash;
    return this._signToken(user.id, user.email);
  }

  private async _signToken(
    sub: number,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = { sub, email };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
    });
    return { access_token: token };
  }
}
