import * as React from 'react';

export interface AssistantMessage { from: 'user' | 'assistant'; text: string; }

/**
 * @startingPoint section="Components" subtitle="Chat assistant shell — static demo, no live model call" viewport="700x420"
 */
export interface AssistantPanelProps {
  open: boolean;
  onClose?: () => void;
  messages?: AssistantMessage[];
}

export function AssistantPanel(props: AssistantPanelProps): JSX.Element | null;
