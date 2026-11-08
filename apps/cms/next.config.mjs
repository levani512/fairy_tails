import { withPayload } from '@payloadcms/next/withPayload';
export default withPayload({
  distDir: process.env.NODE_ENV === 'production' ? '.next-production' : '.next',
});
