import { Global, Module } from '@nestjs/common';
import { GraphRepository } from './graph.repository';

@Global()
@Module({
  providers: [GraphRepository],
  exports: [GraphRepository],
})
export class GraphModule {}
