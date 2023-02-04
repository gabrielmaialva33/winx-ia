import * as fs from 'fs'
import jimp from 'jimp'

import { Configuration, OpenAIApi } from 'openai'
import { Logger } from '@/logger'

import env from '@/env'
import { StringUtils } from '@/helpers/string.utils'
import { HistoryUtils } from '@/helpers/history.utils'

class OpenAI extends OpenAIApi {
  constructor() {
    super(new Configuration({ apiKey: env.OPENAI_TOKEN }))
  }

  public async complete(text: string, username: string) {
    const main = fs.readFileSync(process.cwd() + '/tmp/main.gpt.txt', 'utf8')
    const history = fs.readFileSync(process.cwd() + '/tmp/history.gpt.txt', 'utf8')

    Logger.info(
      `CONTEXT: ${JSON.stringify(StringUtils.info_text(main + history + text))}`,
      'IA/COMPLETE'
    )
    const prompt = StringUtils.remove_breaklines(main + history + text + `Winx(${username}): |`)
    Logger.info(`TOKENS: ${JSON.stringify(StringUtils.count_tokens(prompt))}`, 'IA/COMPLETE')

    if (StringUtils.count_tokens(prompt) > 4000) {
      Logger.error('Tokens limit exceeded!', 'IA/COMPLETE')

      await HistoryUtils.populate_history()

      return this.createCompletion({
        model: 'text-davinci-003',
        prompt: StringUtils.remove_breaklines(main + text + `Winx(${username}): |`),
        max_tokens: 1000,
        temperature: 0.9,
        stop: ['|'],
        presence_penalty: 0.5,
        frequency_penalty: 0.5,
      })
    }

    return this.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 1000,
      temperature: 0.9,
      top_p: 1,
      stop: ['|'],
    })
  }

  public async imagine(text: string, n?: number) {
    Logger.info(`Imagining text: ${text}`, 'IA')
    return this.createImage({
      prompt: text,
      n: n || 1,
      size: '512x512',
      response_format: 'url',
    })
  }

  public async variation(path: string) {
    // change the file extension to png
    const file = await fs.readFileSync(path)
    await jimp.read(file).then((image) => image.writeAsync(`${path}.png`))

    //const png = fs.readFileSync(`${path}.png`)

    // @ts-ignore
    return this.createImageVariation(fs.readFileSync(`${path}.png`), 1, '512x512', 'url')
  }
}

export const IA = new OpenAI()
