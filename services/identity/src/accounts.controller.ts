import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Response } from "express";
import { AccountsService, AVATAR_MAX_BYTES } from "./accounts.service";
import { ListUsersQuery, LoginDto, NicknameQuery, ProfileDto, RegisterDto } from "./dto";
import { AdminTokenGuard, Auth, ClientInfo, UserGuard } from "./guards";

type AuthCtx = { userId: string; sessionId: string };
type Client = { ip: string | null; userAgent: string | null };
type Upload = { buffer: Buffer; mimetype: string; size: number };

@Controller("v1/auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly accounts: AccountsService) {}

  @Get("nickname-available")
  @Throttle({ default: { ttl: 60_000, limit: 40 } })
  nickname(@Query() q: NicknameQuery) {
    return this.accounts.nicknameAvailable(q.nickname);
  }

  @Post("register")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  register(@Body() dto: RegisterDto, @ClientInfo() client: Client) {
    return this.accounts.register(dto, client);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(@Body() dto: LoginDto, @ClientInfo() client: Client) {
    return this.accounts.login(dto, client);
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(UserGuard)
  logout(@Auth() auth: AuthCtx) {
    return this.accounts.logout(auth.userId, auth.sessionId);
  }
}

@Controller("v1/me")
@UseGuards(UserGuard)
export class MeController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  me(@Auth() auth: AuthCtx) {
    return this.accounts.me(auth.userId);
  }

  @Patch("profile")
  profile(@Auth() auth: AuthCtx, @Body() dto: ProfileDto) {
    return this.accounts.updateNickname(auth.userId, dto.nickname);
  }

  @Put("avatar")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: AVATAR_MAX_BYTES + 1, files: 1 } }))
  setAvatar(@Auth() auth: AuthCtx, @UploadedFile() file: Upload | undefined) {
    return this.accounts.setAvatar(auth.userId, file);
  }

  @Delete("avatar")
  clearAvatar(@Auth() auth: AuthCtx) {
    return this.accounts.clearAvatar(auth.userId);
  }

  @Delete()
  @HttpCode(204)
  remove(@Auth() auth: AuthCtx) {
    return this.accounts.deleteAccount(auth.userId);
  }

  @Get("notifications")
  notifications(@Auth() auth: AuthCtx) {
    return this.accounts.notifications(auth.userId);
  }

  @Post("notifications/read")
  @HttpCode(204)
  read(@Auth() auth: AuthCtx) {
    return this.accounts.markRead(auth.userId);
  }

  @Delete("notifications")
  @HttpCode(204)
  clear(@Auth() auth: AuthCtx) {
    return this.accounts.clearNotifications(auth.userId);
  }
}

@Controller("v1/avatars")
export class AvatarsController {
  constructor(private readonly accounts: AccountsService) {}

  /** Публично, как картинка из CDN. URL меняется вместе с avatarVersion, поэтому кэш долгий. */
  @Get(":id")
  async get(@Param("id") id: string, @Res() res: Response) {
    const { bytes, mime } = await this.accounts.avatar(id);
    res.set({
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    res.send(bytes);
  }
}

@Controller("v1/admin")
@UseGuards(AdminTokenGuard)
export class AdminUsersController {
  constructor(private readonly accounts: AccountsService) {}

  @Get("users")
  list(@Query() q: ListUsersQuery) {
    return this.accounts.adminList(q);
  }

  @Get("users/stats")
  stats() {
    return this.accounts.adminStats();
  }

  @Get("users/:id")
  get(@Param("id") id: string) {
    return this.accounts.adminGet(id);
  }

  @Post("users/:id/sessions/revoke")
  @HttpCode(200)
  revoke(@Param("id") id: string) {
    return this.accounts.adminRevokeSessions(id);
  }
}
