import * as React from 'react';

export interface TabItem { value: string; label: string; }
export interface TabsProps {
  items: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
}
export function Tabs(props: TabsProps): JSX.Element;

export interface SidebarItem { key: string; label: string; icon: string; }
/**
 * @startingPoint section="Components" subtitle="Desktop nav rail — 12 modules" viewport="700x420"
 */
export interface SidebarProps {
  items: SidebarItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  brand?: string;
  productTag?: string;
}
export function Sidebar(props: SidebarProps): JSX.Element;
