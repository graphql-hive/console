import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import * as styles from './single-sign-on-loading-skeleton.css';

// Own module so foundry can render it: the subpage pulls in `@/env/frontend`, which previews cannot load.
export function SingleSignOnLoadingSkeleton() {
  return (
    <>
      {/* Overview Section */}
      <section className={styles.singleSignOnLoadingSkeletonSection2}>
        <span className={styles.singleSignOnLoadingSkeletonSpan9}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className={styles.singleSignOnLoadingSkeletonSpan10}>
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className={styles.singleSignOnLoadingSkeletonDiv5}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.singleSignOnLoadingSkeletonDiv6}>
              <span className={styles.singleSignOnLoadingSkeletonSpan11}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={styles.singleSignOnLoadingSkeletonSpan12}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* OIDC Configuration Section */}
      <section className={styles.singleSignOnLoadingSkeletonSection2}>
        <span className={styles.singleSignOnLoadingSkeletonSpan13}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <div className={styles.singleSignOnLoadingSkeletonDiv5}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.singleSignOnLoadingSkeletonDiv6}>
              <span className={styles.singleSignOnLoadingSkeletonSpan11}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={styles.singleSignOnLoadingSkeletonSpan10}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Registered Domains Section */}
      <section className={styles.singleSignOnLoadingSkeletonSection2}>
        <span className={styles.singleSignOnLoadingSkeletonSpan14}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className={styles.singleSignOnLoadingSkeletonSpan15}>
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className={styles.singleSignOnLoadingSkeletonDiv6}>
          <span className={styles.singleSignOnLoadingSkeletonSpan9}>
            <Skeleton variants={{ width: 'full' }} />
          </span>
          <span className={styles.singleSignOnLoadingSkeletonSpan9}>
            <Skeleton variants={{ width: 'full' }} />
          </span>
        </div>
      </section>

      {/* Access Settings Section */}
      <section className={styles.singleSignOnLoadingSkeletonSection2}>
        <span className={styles.singleSignOnLoadingSkeletonSpan11}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.singleSignOnLoadingSkeletonDiv7}>
            <div className={styles.singleSignOnLoadingSkeletonDiv8}>
              <span className={styles.singleSignOnLoadingSkeletonSpan13}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={styles.singleSignOnLoadingSkeletonSpan10}>
                <Skeleton variants={{ size: 'sm', width: 'full' }} />
              </span>
            </div>
            <span className={styles.singleSignOnLoadingSkeletonSpan16}>
              <Skeleton variants={{ shape: 'block' }} />
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
