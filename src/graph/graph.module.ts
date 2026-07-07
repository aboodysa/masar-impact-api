import { Global, Module } from '@nestjs/common';
import { GraphRepository } from './graph.repository';
import { GraphController } from './graph.controller';

@Global()
@Module({
  controllers: [GraphController],
  providers: [GraphRepository],
  exports: [GraphRepository],
})
export class GraphModule {}
