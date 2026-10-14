import ToolSeo from '../components/ToolSeo';
import { toolMetadata } from '@/lib/toolMeta';

export const metadata = toolMetadata('/tax-calendar');

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ToolSeo path="/tax-calendar" />{children}</>;
}
