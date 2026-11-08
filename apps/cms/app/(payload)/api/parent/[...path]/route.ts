import { parentHandler } from '../../../../../src/parent-api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function handle(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return parentHandler(req, (await params).path);
}
export { handle as GET, handle as POST, handle as OPTIONS };
