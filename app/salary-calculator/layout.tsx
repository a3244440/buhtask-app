import ToolSeo from '../components/ToolSeo';
import { toolMetadata } from '@/lib/toolMeta';

export const metadata = toolMetadata('/salary-calculator');

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ToolSeo path="/salary-calculator" />{children}</>;
}
