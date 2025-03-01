import { THEME } from "../constants/constants";
import type { Theme } from "@zsviczian/excalidraw/types/excalidraw/element/types";
import type { DataURL } from "@zsviczian/excalidraw/types/excalidraw/types";
import type { OpenAIInput, OpenAIOutput } from "@zsviczian/excalidraw/types/excalidraw/data/ai/types";
import ExcalidrawPlugin from "src/core/main";

export type MagicCacheData =
  | {
      status: "pending";
    }
  | { status: "done"; html: string }
  | {
      status: "error";
      message?: string;
      code: "ERR_GENERATION_INTERRUPTED" | string;
    };

const SYSTEM_PROMPT = `You are a skilled front-end developer who builds interactive prototypes from wireframes, and is an expert at CSS Grid and Flex design.
Your role is to transform low-fidelity wireframes into working front-end HTML code.
YOU MUST FOLLOW FOLLOWING RULES:
- Use HTML, CSS, JavaScript to build a responsive, accessible, polished prototype
- Leverage Tailwind for styling and layout (import as script <script src="https://cdn.tailwindcss.com"></script>)
- Inline JavaScript when needed
- Fetch dependencies from CDNs when needed (using unpkg or skypack)
- Source images from Unsplash or create applicable placeholders
- Interpret annotations as intended vs literal UI
- Fill gaps using your expertise in UX and business logic
- generate primarily for desktop UI, but make it responsive.
- Use grid and flexbox wherever applicable.
- Convert the wireframe in its entirety, don't omit elements if possible.
If the wireframes, diagrams, or text is unclear or unreadable, refer to provided text for clarification.
Your goal is a production-ready prototype that brings the wireframes to life.
Please output JUST THE HTML file containing your best attempt at implementing the provided wireframes.`;

export async function diagramToHTML({
  image,
  apiKey,
  text,
  theme = THEME.LIGHT,
}: {
  image: DataURL;
  apiKey: string;
  text: string;
  theme?: Theme;
}) {
  const body: OpenAIInput.ChatCompletionCreateParamsBase = {
    model: "gpt-4-vision-preview",
    // 4096 are max output tokens allowed for `gpt-4-vision-preview` currently
    max_tokens: 4096,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: image,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `Above is the reference wireframe. Please make a new website based on these and return just the HTML file. Also, please make it for the ${theme} theme. What follows are the wireframe's text annotations (if any)...`,
          },
          {
            type: "text",
            text,
          },
        ],
      },
    ],
  };

  let result:
    | ({ ok: true } & OpenAIOutput.ChatCompletion)
    | ({ ok: false } & OpenAIOutput.APIError);

  return await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

export const diagramToHTMLByDify = async (
  {
    image,
    text,
    theme = THEME.LIGHT,
  }: {
    image: DataURL;
    text: string;
    theme?: Theme;
  }
): Promise<any> => {
  const plugin: ExcalidrawPlugin = window.ExcalidrawAutomate.plugin;
  const { aiApiURL, aiToCodeToken } = plugin.settings;

  const prompt = `Above is the reference wireframe. Please make a new website based on these and return just the HTML file. Also, please make it for the ${theme} theme. What follows are the wireframe's text annotations (if any)...`;

  // 构造 Dify 的请求体
  const body = {
    inputs: {}, // 如果需要传递额外参数，可以在这里添加
    query: prompt + ":" + text, // 用户输入的文本
    response_mode: "blocking", // 同步模式（或 "streaming" 流式模式）
    conversation_id: "", // 如果需要继续某个对话，可以传入 conversation_id
    user: "alcboard", // 用户标识
    files: [
      {
        type: "image", // 文件类型
        transfer_method: "remote_url", // 文件传输方式
        url: image, // 图片 URL
      },
    ],
  };

  return await fetch(
    `${aiApiURL}/v1/chat-messages`, // Dify 的 API 端点
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiToCodeToken}`, // 使用 Dify 的 Token
      },
      body: JSON.stringify(body),
    }
  );


};