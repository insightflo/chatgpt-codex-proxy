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

export interface ToolUseContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultContentBlock {
  type: "tool_result";
  tool_use_id: string;
  content?: string | ContentBlock[];
  is_error?: boolean;
}

export type ContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock;

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
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  parallel_tool_calls?: boolean;
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export type AnthropicToolChoice =
  | { type: "auto" | "any" | "none" }
  | { type: "tool"; name: string };

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
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;
  stop_sequence?: string | null;
  usage: Usage;
}
