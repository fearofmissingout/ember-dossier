export function onRequestPost(context: {
  env: Record<string, string | undefined>;
  request: Request;
}): Promise<Response>;
