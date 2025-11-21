'use client';

import { ReactNode } from 'react';
import { cn, CodegenIcon, HiveGatewayIcon, HiveIcon } from '@theguild/components';
import { DashedLine } from './dashed-line';
import { GraphQLLogo } from './graphql-logo';
import { IconGradientDefs } from './icon-gradient-defs';
import { AndroidLogo } from './logos/android';
import { AppleLogo } from './logos/apple';
import { GrpcLogo } from './logos/grpc';
import { McpLogo } from './logos/mcp';
import { OpenAPILogo } from './logos/openapi';
import { ReactLogo } from './logos/react';
import styles from './ecosystem-management.module.css';

export function EcosystemIllustration(props: { className?: string }) {
  const boxHeight = 66; // p-4 (16*2) + size-8 (32) + border (2)
  const halfBoxHeight = boxHeight / 2;

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-center gap-y-0 overflow-visible md:grid-cols-[min-content_auto_min-content_auto_min-content]',
        props.className,
        styles.container,
      )}
    >
      <IconGradientDefs />

      {/* Col 1: Codegen (Desktop) */}
      <div className="hidden items-center justify-end md:flex">
        <Node title="Codegen" description="GraphQL Code Generation" className="z-20">
          <CodegenIcon className="size-12 fill-[url(#linear-blue)] stroke-[url(#linear-white)] stroke-[0.5px]" />
        </Node>
      </div>

      {/* Col 2: Left Connections */}
      <div
        className="hidden h-full w-[107px] grid-rows-2 justify-center md:grid"
        style={{ paddingBlock: halfBoxHeight }}
      >
        {/* Top-Left Line: Connects Top-Center to Side-Center */}
        <DashedLine
          className="translate-x-[1.5px] self-start text-green-700/50"
          fill="none"
          stroke="currentColor"
        />
        {/* Bottom-Left Line: Connects Bottom-Center to Side-Center */}
        <DashedLine
          className="translate-x-[1.5px] -scale-y-100 self-end text-green-700/50"
          fill="none"
          stroke="currentColor"
        />
      </div>

      {/* Col 3: Center Stack */}
      <div className="flex w-max flex-col items-center">
        {/* Row 1: Top Icons */}
        <div className="z-20 flex justify-center pb-4 md:pb-0">
          <div className="flex gap-4 rounded-2xl border border-green-700/50 bg-white/5 p-4">
            <ReactLogo className="size-8" />
            <AppleLogo className="size-8" />
            <AndroidLogo className="size-8" />
            <McpLogo className="size-8" />
          </div>
        </div>

        {/* Vertical Line */}
        <div className="h-12 w-px bg-green-700/50 md:h-16" />

        {/* Row 2: Stellate */}
        <div className="z-20 flex justify-center">
          <Node title="Stellate" description="GraphQL Edge Security and Caching Layer">
            <HiveIcon className="size-12 [&>g]:fill-[url(#linear-blue)] [&>g]:stroke-[url(#linear-white)] [&>g]:stroke-[0.2px]" />
          </Node>
        </div>

        {/* Vertical Line */}
        <div className="h-12 w-px bg-green-700/50 md:h-16" />

        {/* Row 3: Gateway */}
        <div className="z-20 flex justify-center">
          <Node title={null} description={null} className="flex-row gap-8 px-8">
            <div className="flex flex-col items-center gap-2">
              <HiveGatewayIcon className="size-12 fill-[url(#linear-blue)] stroke-[url(#linear-white)] stroke-[0.5px]" />
              <span className="font-medium text-green-100">Hive Gateway</span>
            </div>
            <div className="w-px bg-green-700/50" />
            <div className="flex flex-col items-center gap-2">
              <HiveIcon className="size-12 [&>g]:fill-[url(#linear-blue)] [&>g]:stroke-[url(#linear-white)] [&>g]:stroke-[0.2px]" />
              <span className="text-center font-medium text-green-100">
                Hive Router
                <br />
                (Rust)
              </span>
            </div>
          </Node>
        </div>

        {/* Vertical Line */}
        <div className="h-12 w-px bg-green-700/50 md:h-16" />

        {/* Row 4: Bottom Icons */}
        <div className="z-20 flex justify-center">
          <div className="flex gap-4 rounded-2xl border border-green-700/50 bg-white/5 p-4">
            <GraphQLLogo className="size-8" />
            <OpenAPILogo className="size-8" />
            <GrpcLogo className="size-8" />
          </div>
        </div>
      </div>

      {/* Col 4: Right Connections */}
      <div
        className="hidden h-full w-[107px] grid-rows-2 justify-center md:grid"
        style={{ paddingBlock: halfBoxHeight }}
      >
        {/* Top-Right Line: Connects Top-Center to Side-Center */}
        <DashedLine
          className="translate-x-[-1.5px] -scale-x-100 self-start text-green-700/50"
          fill="none"
          stroke="currentColor"
        />
        {/* Bottom-Right Line: Connects Bottom-Center to Side-Center */}
        <DashedLine
          className="translate-x-[-1.5px] -scale-100 self-end text-green-700/50"
          fill="none"
          stroke="currentColor"
        />
      </div>

      {/* Col 5: Console (Desktop) */}
      <div className="hidden items-center justify-start md:flex">
        <Node
          title={
            <>
              <span className={styles.smHidden}>Hive</span> Console
            </>
          }
          description="Schema registry and monitoring"
          className="z-20"
        >
          <HiveIcon className="size-12 [&>g]:fill-[url(#linear-blue)] [&>g]:stroke-[url(#linear-white)] [&>g]:stroke-[0.2px]" />
        </Node>
      </div>

      {/* Mobile Only Nodes (inserted into flow for mobile) */}
      <div className="col-start-1 flex justify-center pb-4 md:hidden">
        <Node title="Codegen" description="GraphQL Code Generation">
          <CodegenIcon className="size-12 fill-[url(#linear-blue)] stroke-[url(#linear-white)] stroke-[0.5px]" />
        </Node>
      </div>
      <div className="col-start-1 flex justify-center pb-4 md:hidden">
        <Node title="Hive Console" description="Schema registry and monitoring">
          <HiveIcon className="size-12 [&>g]:fill-[url(#linear-blue)] [&>g]:stroke-[url(#linear-white)] [&>g]:stroke-[0.2px]" />
        </Node>
      </div>
    </div>
  );
}

interface EdgeProps extends React.HTMLAttributes<HTMLElement> {
  top?: boolean;
  left?: boolean;
  bottom?: boolean;
}

function Edge({ top, bottom, left, className, ...rest }: EdgeProps) {
  return (
    <div
      className={cn(
        className,
        '[&>:nth-child(odd)]:border-green-700',
        top &&
          (bottom
            ? '[&>:nth-child(1)]:border-t [&>:nth-child(3)]:border-b'
            : '[&>:nth-child(odd)]:border-t'),
        left && '[&>:nth-child(odd)]:border-l',
      )}
      {...rest}
    />
  );
}

interface NodeProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
}

function Node({ title, description, children, className, ...rest }: NodeProps) {
  return (
    <div
      className={cn(
        styles.node,
        'relative z-10 flex min-h-[96px] items-center gap-2 rounded-2xl p-4 xl:gap-4 xl:p-[22px]' +
          ' bg-[linear-gradient(135deg,rgb(255_255_255/0.10),rgb(255_255_255/0.20))]' +
          ' [&>svg]:flex-shrink-0',
        className,
      )}
      {...rest}
    >
      {children}
      {(title || description) && (
        <div>
          <div className="font-medium text-green-100">{title}</div>
          {description && (
            <div className={cn('mt-0.5 text-sm leading-5 text-green-200', styles.desc)}>
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
