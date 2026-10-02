import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  try {
    process.loadEnvFile(".env");
  } catch {
    // в docker/k8s переменные приходят из окружения
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // за reverse proxy (Caddy) — IP клиента из X-Forwarded-For: на нём держатся лимиты запросов и журнал
  if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

  const origins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-RouteX-User"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: "validation",
          message: errors.map((e) => Object.values(e.constraints ?? {}).join(", ")).join("; "),
        }),
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4010);
  await app.listen(port);
  console.log(`support listening on :${port}`);
}

void bootstrap();
