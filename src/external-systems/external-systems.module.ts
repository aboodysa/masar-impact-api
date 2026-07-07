import { Module } from '@nestjs/common';
import { ExternalSystemsController } from './external-systems.controller';

@Module({
  controllers: [ExternalSystemsController],
})
export class ExternalSystemsModule {}
