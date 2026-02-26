export type MessageRole = "user" | "assistant" | "system";

export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ImageSource {
  type: "base64";
  media_type: string;
  data: string;
}

export interface ImageContentBlock {
  type: "image";
  source: ImageSource;
}

export type ContentBlock = TextContentBlock | ImageContentBlock;

export interface AnthropicMessage {
  role: Exclude<MessageRole, "system">;
  content: string | ContentBlock[];
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string | ContentBlock[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  stop_sequences?: string[];
  metadata?: Record<string, unknown>;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | null;
  stop_sequence?: string | null;
  usage: Usage;
}
