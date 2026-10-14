import ToolSeo from '../components/ToolSeo';
import { toolMetadata } from '@/lib/toolMeta';

export const metadata = toolMetadata('/maternity-calculator');

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ToolSeo path="/maternity-calculator" />{children}</>;
}
