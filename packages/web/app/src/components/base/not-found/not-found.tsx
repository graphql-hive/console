import { type ReactNode } from 'react';
import connection from '../../../../public/images/figures/connection.svg?url';
import ghost from '../../../../public/images/figures/ghost.svg?url';
import { cva, type VariantProps } from 'class-variance-authority';
import { Button } from '@/components/base/button/button';
import { useRouter } from '@tanstack/react-router';

const illustrations = {
  ghost,
  connection,
};

export const resourceAccessDescription = (
  <>
    <p>It seems like you do not have access to this resource or it does not exist.</p>
    <p>Please check again with your organization admin.</p>
  </>
);

// `px-6` on the root rather than on `horizontal` alone: the centred layout needs it too once the
// viewport is narrow enough for a long title to reach the edges.
export const notFoundVariants = cva('flex items-center justify-center px-6', {
  variants: {
    layout: {
      centered: 'flex-col gap-2.5',
      horizontal: '',
    },

    fullScreen: {
      true: 'h-screen',
      false: 'h-full flex-1 py-6',
    },
  },
  defaultVariants: {
    layout: 'centered',
    fullScreen: false,
  },
});

type NotFoundProps = {
  /**
   * Display line above the title, for the route-level 404's "404". The title carries the meaning,
   * so keep this short.
   */
  bigHeading?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Browser history back, so it is a no-op when the page was opened as a first-load deep link. */
  showBackButton?: boolean;
  variants?: VariantProps<typeof notFoundVariants> & { illustration?: keyof typeof illustrations };
};

export function NotFound({
  bigHeading,
  title,
  description,
  showBackButton = true,
  variants,
}: NotFoundProps) {
  const router = useRouter();

  const image = (
    <img
      src={illustrations[variants?.illustration ?? 'ghost']}
      alt=""
      width={200}
      height={200}
      className="drag-none block size-[200px]"
    />
  );

  const heading = bigHeading ? <p className="text-5xl font-bold">{bigHeading}</p> : null;
  const titleEl = <h2 className="text-xl font-bold">{title}</h2>;
  const descriptionEl = description ? (
    <div className="text-neutral-10 text-sm">{description}</div>
  ) : null;
  const backButton = showBackButton ? (
    <div className="mt-2">
      <Button variant="outline" onClick={router.history.back}>
        Go back
      </Button>
    </div>
  ) : null;

  if (variants?.layout === 'horizontal') {
    return (
      <div className={notFoundVariants({ ...variants })}>
        <div className="flex max-w-[960px] flex-col items-center gap-x-6 sm:flex-row">
          {image}
          <div className="grow text-center sm:text-left">
            {heading}
            {titleEl}
            {descriptionEl ? <div className="mt-2">{descriptionEl}</div> : null}
            {backButton}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={notFoundVariants({ ...variants })}>
      {image}
      {heading}
      {titleEl}
      {descriptionEl}
      {backButton}
    </div>
  );
}
