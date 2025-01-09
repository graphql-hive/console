import { Args } from '@oclif/core';
import Command from '../../base-command';
import { Texture } from '../../helpers/texture/texture';

export default class DeleteConfig extends Command<typeof DeleteConfig> {
  static description = 'deletes specific cli configuration';
  static args = {
    key: Args.string({
      name: 'key',
      required: true,
      description: 'config key',
    }),
  };

  async run() {
    const { args } = await this.parse(DeleteConfig);
    this._userConfig!.delete(args.key);
    this.logSuccess(Texture.boldQuotedWords(`Config flag "${args.key}" was deleted`));
  }
}
