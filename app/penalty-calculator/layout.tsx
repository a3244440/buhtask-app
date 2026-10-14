import ToolSeo from '../components/ToolSeo';
import { toolMetadata } from '@/lib/toolMeta';

export const metadata = toolMetadata('/penalty-calculator');

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ToolSeo path="/penalty-calculator" />{children}</>;
}
