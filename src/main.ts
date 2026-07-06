import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.use(helmet());
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('MASAR Impact Analysis API')
    .setDescription('API for impact analysis of MASAR government services. Includes service graph traversal, async job processing, and Mermaid diagram generation.')
    .setVersion('1.0.0')
    .addServer('https://myapi.businessanalystcrew.org', 'Production')
    .addServer('http://localhost:3000', 'Local')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`MASAR Impact API (NestJS) running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
