import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';

interface BetaBadgeProps {
  /**
   * Optional custom tooltip message. If not provided, uses default translation.
   */
  tooltipMessage?: string;
  /**
   * Badge variant
   */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  /**
   * Badge size
   */
  size?: 'sm' | 'md' | 'lg';
}

export function BetaBadge({
  tooltipMessage,
  variant = 'default',
  size = 'sm'
}: BetaBadgeProps) {
  const t = useTranslations();

  const defaultMessage = t('common.betaTooltip');
  const message = tooltipMessage || defaultMessage;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className={`${sizeClasses[size]} font-semibold cursor-help`}
          >
            BETA
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
