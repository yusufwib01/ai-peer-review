export type HttpMethod = "GET" | "POST";

export interface GitHubResponse {
  status: number;
  text: string;
}

export interface CommitCommentBase {
  body: string;
}

export interface CommitCommentInlineByLine extends CommitCommentBase {
  path: string;
  position: number;
}

export type CommitCommentPayload = CommitCommentBase | CommitCommentInlineByLine;
