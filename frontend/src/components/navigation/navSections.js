import { 
  Home,
  Package, 
  Sparkles, 
  ShieldCheck, 
  ClipboardCheck, 
  Settings
} from 'lucide-react';

export const NAV_ITEMS = [
  { title: 'Home', path: '/dashboard', icon: Home, exact: true },
  { title: 'Products', path: '/dashboard/products', icon: Package },
  { title: 'AI Intelligence', path: '/dashboard/ai', icon: Sparkles },
  { title: 'Data Quality', path: '/dashboard/quality', icon: ShieldCheck },
  { title: 'Validation', path: '/dashboard/validation', icon: ClipboardCheck },
  { title: 'Settings', path: '/dashboard/settings', icon: Settings },
];

// Keep for backward compat (referenced elsewhere)
export const NAV_SECTIONS = NAV_ITEMS;
