import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // We restore static serving. It is safe because video files are encrypted at rest,
  // meaning if someone downloads them statically, they are unreadable without the API decryption stream.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable cookie parser
  app.use(cookieParser());

  // Increase payload size limit to 
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // API Request Logger Middleware
  app.use((req: any, res: any, next: any) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;

    // Log incoming request
    console.log(`\n🌐 [${timestamp}] ${method} ${url}`);

    // Log request body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(method) && req.body) {
      const safeBody = { ...req.body };
      // Hide sensitive data
      if (safeBody.password) safeBody.password = "***";
      if (safeBody.confirmPassword) safeBody.confirmPassword = "***";
      console.log("📦 Request Body:", JSON.stringify(safeBody, null, 2));
    }

    // Log response when finished
    const originalSend = res.send;
    res.send = function (data: any) {
      console.log(
        `✅ [${timestamp}] ${method} ${url} - Status: ${res.statusCode}`
      );
      return originalSend.call(this, data);
    };

    next();
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields (common with FormData)
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global prefix
  app.setGlobalPrefix("api");

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("ASD Therapy Platform API")
    .setDescription(
      "Multi-role authentication API for Therapists, Caregivers, and Admins"
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 5001;
  await app.listen(port);
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`
  );
  console.log(
    `API Documentation available at http://localhost:${port}/api/docs`
  );
}
bootstrap();
