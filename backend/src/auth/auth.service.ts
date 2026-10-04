import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Role, UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';
import { AuthResponse, JwtPayload, toAuthUser } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const BCRYPT_SALT_ROUNDS = 12;

// Compared against when the email is unknown, so failed logins take the same
// time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_SALT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Only customers and providers can self-register; admins are never created here.
  async register(
    dto: RegisterDto,
    role: Role.Customer | Role.Provider,
  ): Promise<AuthResponse> {
    if (await this.usersService.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.password ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: UserDocument): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id as string,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: toAuthUser(user),
    };
  }
}
