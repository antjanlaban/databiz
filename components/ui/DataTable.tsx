'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableProps {
  headers: string[];
  children: React.ReactNode;
  stickyFirstColumn?: boolean;
  className?: string;
}

export function DataTable({
  headers,
  children,
  stickyFirstColumn = false,
  className,
}: DataTableProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {headers.map((header, index) => (
              <TableHead
                key={index}
                className={cn(
                  'text-xs font-semibold text-muted-foreground bg-card',
                  index === 0 && stickyFirstColumn && 'sticky left-0 z-20 border-r border-border'
                )}
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  stickyFirstColumn?: boolean;
}

export function DataTableRow({
  children,
  stickyFirstColumn = false,
  className,
  ...props
}: DataTableRowProps) {
  return (
    <TableRow className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === DataTableCell) {
          return React.cloneElement(child as React.ReactElement, {
            className: cn(
              child.props.className,
              'text-xs',
              index === 0 && stickyFirstColumn && 'sticky left-0 z-10 bg-card border-r border-border'
            ),
          });
        }
        return child;
      })}
    </TableRow>
  );
}

export const DataTableCell = TableCell;
