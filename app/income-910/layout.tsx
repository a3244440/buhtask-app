import ToolSeo from '../components/ToolSeo';
import { toolMetadata } from '@/lib/toolMeta';

export const metadata = toolMetadata('/income-910');

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ToolSeo path="/income-910" />{children}</>;
}
