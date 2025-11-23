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

/**
 *                      +-----------------------------+
 *                      |   Clients / Applications    |
 *                  .-->| (React, iOS, Android, etc.) |<--.
 *                  |   +--------------+--------------+   |
 *                  |                  |                  |
 *                  |                  |                  |
 *                  |        +---------v---------+        |
 *                  |        |     Stellate      |        |
 *                  |        |   (Edge Security  |<-------+
 *                  |        |  & Caching Layer) |        |
 *                  |        +---------+---------+        |
 *                  |                  |                  |
 * +-------------+  |                  |                  |  +-------+------+
 * |   Codegen   |  |                  |                  |  | Hive Console |
 * |  (GraphQL   +--+                  |                  +--+   (Schema    |
 * | Code Gen.)  |  |                  |                  |  |  Registry)   |
 * +-------------+  |                  |                  |  +-------+------+
 *                  |                  |                  |
 *                  |        +-------------------+        |
 *                  |        |    Hive Gateway   |        |
 *                  |        |         &         |<-------+
 *                  |        |    Hive Router    |        |
 *                  |        +---------+---------+        |
 *                  |                  |                  |
 *                  |                  |                  |
 *                  |        +---------v---------+        |
 *                  `------->|     Services      |<-------'
 *                           |  (GraphQL, gRPC)  |
 *                           +-------------------+
 */
export function EcosystemIllustration(props: { className?: string }) {
  const boxHeight = 66;
  const halfBoxHeight = boxHeight / 2;
  const stellateHeight = 96;
  const gatewayHeight = 136;

  return (
    <div
      className={cn(
        'grid flex-1 grid-cols-1 items-center gap-y-0 overflow-visible md:grid-cols-[auto_minmax(2rem,1fr)_min-content_minmax(2rem,1fr)_auto]',
        props.className,
        styles.container,
        '[--edge:24px] sm:[--edge:48px]',
      )}
      style={
        {
          '--stellate-height': `${stellateHeight}px`,
          '--gateway-height': `${gatewayHeight}px`,
        } as React.CSSProperties
      }
    >
      <IconGradientDefs />

      {/* Col 1: Codegen (Desktop) */}
      <div className="hidden items-center justify-end md:flex">
        <Node
          title="Codegen"
          description={
            <>
              GraphQL Code
              <br />
              Generation
            </>
          }
          className="z-20"
        >
          <CodegenIcon className="size-12 fill-[url(#linear-blue)] stroke-[url(#linear-white)] stroke-[0.5px]" />
        </Node>
      </div>

      {/* Col 2: Left Connections */}
      <div
        className="hidden grid-rows-2 justify-center md:grid"
        style={{ paddingBlock: halfBoxHeight }}
      >
        {/* Top-Left Line: Connects Top-Center to Side-Center */}
        <DashedLine className="translate-x-[1.5px] translate-y-[-1.5px] self-start text-green-700" />
        {/* Bottom-Left Line: Connects Bottom-Center to Side-Center */}
        <DashedLine className="translate-x-[1.5px] translate-y-[1.5px] -scale-y-100 self-end text-green-700" />
      </div>

      <div className="flex h-full w-max flex-col items-center max-md:mx-auto">
        <div className="z-20 flex justify-center">
          <div className="flex gap-4 rounded-2xl border border-green-700 bg-white/5 p-4 backdrop-blur-md">
            <ReactLogo className="size-8" />
            <AppleLogo className="size-8" />
            <AndroidLogo className="size-8" />
            <McpLogo className="size-8" />
          </div>
        </div>

        <div
          className="w-[3px] bg-green-700"
          style={{ height: 'calc(var(--edge) + var(--stellate-height) / 2)' }}
        />

        <div className="z-20 flex justify-center">
          <Node
            title="Stellate"
            description={
              <>
                GraphQL Edge Security
                <br />
                and Caching Layer
              </>
            }
            className="h-[--stellate-height] max-md:px-6"
          >
            <HiveIcon className="size-12 [&>g]:fill-[url(#linear-blue)] [&>g]:stroke-[url(#linear-white)] [&>g]:stroke-[0.2px]" />
          </Node>
        </div>

        <div
          className="w-[3px] bg-green-700"
          style={{ height: 'calc(var(--stellate-height) / 2 + var(--gateway-height) / 2)' }}
        />

        <div className="z-20 flex justify-center">
          <Node
            title={null}
            description={null}
            className="h-[--gateway-height] flex-row gap-2 px-8"
          >
            <div className="flex flex-col items-center gap-2">
              <HiveGatewayIcon className="size-12 fill-[url(#linear-blue)] stroke-[url(#linear-white)] stroke-[0.5px]" />
              <span className="font-medium text-green-100">Hive Gateway</span>
            </div>
            <div className="w-px bg-green-700" />
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

        <div
          className="w-[3px] bg-green-700"
          style={{ height: 'calc(var(--edge) + var(--gateway-height) / 2)' }}
        />

        <div className="z-20 flex justify-center">
          <div className="flex gap-4 rounded-2xl border border-green-700 bg-white/5 p-4 backdrop-blur-md">
            <GraphQLLogo className="size-8" />
            <OpenAPILogo className="size-8" />
            <GrpcLogo className="size-8" />
          </div>
        </div>
      </div>

      {/* Col 4: Right Connections */}
      <div
        className="relative hidden shrink grow-0 grid-flow-col-dense grid-cols-1 grid-rows-[1fr,129px,111px,1fr] place-items-center justify-center md:grid"
        style={{ paddingBlock: halfBoxHeight }}
      >
        <DashedLine className="row-span-2 row-start-1 translate-x-[-1.5px] translate-y-[-1.5px] -scale-x-100 self-start text-green-700" />
        <DashedLine className="row-span-2 row-start-3 translate-x-[-1.5px] translate-y-[1.5px] -scale-100 self-end text-green-700" />
        <DashedLine
          className="absolute top-0 row-span-1 row-start-3 translate-x-[-1.5px] translate-y-[-1.5px] -scale-100 self-end text-green-700"
          short
        />
        <DashedLine
          className="absolute row-span-1 row-start-2 translate-x-[-1.5px] translate-y-[1.5px] -scale-x-100 self-end text-green-700"
          short
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
          description={
            <>
              Schema registry
              <br />
              and monitoring
            </>
          }
          className="z-20"
        >
          <HiveIcon className="size-12 [&>g]:fill-[url(#linear-blue)] [&>g]:stroke-[url(#linear-white)] [&>g]:stroke-[0.2px]" />
        </Node>
      </div>
    </div>
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
        'relative z-10 flex min-h-[96px] items-center gap-4 rounded-2xl bg-[linear-gradient(135deg,rgb(255_255_255/0.10),rgb(255_255_255/0.20))] p-4 backdrop-blur-md xl:p-[22px] [&>svg]:shrink-0',
        description && 'flex-row',
        className,
      )}
      {...rest}
    >
      {children}
      {(title || description) && (
        <div className="flex flex-col text-left">
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
