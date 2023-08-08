import * as fs from 'fs'
import * as process from 'process'
import jimp from 'jimp'
import { DateTime } from 'luxon'

import {
  Configuration,
  OpenAIApi,
  CreateCompletionRequest,
  ChatCompletionRequestMessageRoleEnum,
} from 'openai'

import Env from '@/config/env'

import { Logger } from '@/helpers/logger.utils'
import { StringUtils } from '@/helpers/string.utils'
import { HistoryUtils } from '@/helpers/history.utils'

class OpenAI extends OpenAIApi {
  private config: CreateCompletionRequest = {
    model: 'text-davinci-002',
    temperature: 1,
    max_tokens: 156,
    frequency_penalty: 1,
    presence_penalty: 1,
    n: 1,
    stop: ['||'],
  }

  constructor() {
    super(new Configuration({ apiKey: Env.OPENAI_TOKEN }))
  }

  public async complete(text: string, username: string) {
    const temp_main = fs.readFileSync(process.cwd() + '/tmp/main.gpt.txt', 'utf8')
    const history = fs.readFileSync(process.cwd() + '/tmp/history.gpt.txt', 'utf8')

    const main = temp_main
      .replace(
        '$date',
        DateTime.local({ zone: 'America/Sao_Paulo' }).toLocaleString(DateTime.DATE_FULL)
      )
      .replace(
        '$time',
        DateTime.local({ zone: 'America/Sao_Paulo' }).toLocaleString(DateTime.TIME_SIMPLE)
      )

    Logger.info(
      `context: ${JSON.stringify(StringUtils.InfoText(main + history + text))}`,
      'ai.complete'
    )
    Logger.info(`config: ${JSON.stringify(this.config)}`, 'ai.complete')

    const prompt = StringUtils.RemoveBreakLines(main + history + text + `Winx(${username}):||`)

    if (StringUtils.CountTokens(prompt) > 4096) {
      Logger.error('tokens limit exceeded!', 'ai.complete')

      await HistoryUtils.populate_history()

      return this.createCompletion({ prompt, ...this.config }, { timeout: 30000 })
    }

    return this.createCompletion({ prompt, ...this.config }, { timeout: 30000 })
  }

  public async imagine(text: string, n?: number) {
    Logger.info(`imagining text: ${text}`, 'ai.imagine')

    return this.createImage({
      prompt: text,
      n: n || 1,
      size: '512x512',
      response_format: 'url',
    })
  }

  public async variation(path: string) {
    const file = await fs.promises.readFile(path)
    await jimp.read(file).then((image) => image.writeAsync(`${path}.png`))

    const image = await jimp.read(`${path}.png`)
    await image.resize(512, 512).writeAsync(`${path}.png`)

    Logger.info(`variation image: ${path}.png`, 'ai.variation')

    return this.createImageVariation(fs.createReadStream(`${path}.png`) as any, 1, '512x512', 'url')
  }

  public async gpt3(text: string) {
    Logger.info(`gpt3 text: ${text}`, 'ai.gpt3')

    return this.createChatCompletion({
      model: 'gpt-3.5-turbo',
      temperature: 1,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: [
        {
          role: ChatCompletionRequestMessageRoleEnum.System,
          content: 'Você é a Winx AI 🤖 que responde os usuários do grupo Club das Winx 🧚‍♀️',
        },
        { role: ChatCompletionRequestMessageRoleEnum.User, content: text },
      ],
    })
  }
}

export const IA = new OpenAI()
