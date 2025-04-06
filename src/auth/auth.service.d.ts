import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { ValidatedUserPayload } from './strategies/local.strategy';

export declare class AuthService {
  private userService;
  private jwtService;
  constructor(userService: UserService, jwtService: JwtService);
  validateUser(username: string, pass: string): Promise<User | null>;
  login(user: ValidatedUserPayload): {
    openId: string;
  };
}
