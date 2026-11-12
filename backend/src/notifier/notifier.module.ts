import { Global, Module } from '@nestjs/common';
import { PushModule } from '../push/push.module.js';
import { NotifierService } from './notifier.service.js';

@Global()
@Module({
  imports: [PushModule],
  providers: [NotifierService],
  exports: [NotifierService],
})
export class NotifierModule {}
