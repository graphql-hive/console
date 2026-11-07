import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { singleSignOnLoadingSkeletonStyles } from './single-sign-on-loading-skeleton.css';

// Own module so foundry can render it: the subpage pulls in `@/env/frontend`, which previews cannot load.
export function SingleSignOnLoadingSkeleton() {
  return (
    <>
      {/* Overview Section */}
      <section className={singleSignOnLoadingSkeletonStyles.section}>
        <span className={singleSignOnLoadingSkeletonStyles.line[24]}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className={singleSignOnLoadingSkeletonStyles.line[72]}>
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className={singleSignOnLoadingSkeletonStyles.rows}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={singleSignOnLoadingSkeletonStyles.row}>
              <span className={singleSignOnLoadingSkeletonStyles.line[36]}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={singleSignOnLoadingSkeletonStyles.line[80]}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* OIDC Configuration Section */}
      <section className={singleSignOnLoadingSkeletonStyles.section}>
        <span className={singleSignOnLoadingSkeletonStyles.line[40]}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <div className={singleSignOnLoadingSkeletonStyles.rows}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={singleSignOnLoadingSkeletonStyles.row}>
              <span className={singleSignOnLoadingSkeletonStyles.line[36]}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={singleSignOnLoadingSkeletonStyles.line[72]}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Registered Domains Section */}
      <section className={singleSignOnLoadingSkeletonStyles.section}>
        <span className={singleSignOnLoadingSkeletonStyles.line[44]}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        <span className={singleSignOnLoadingSkeletonStyles.line[96]}>
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <div className={singleSignOnLoadingSkeletonStyles.row}>
          <span className={singleSignOnLoadingSkeletonStyles.line[24]}>
            <Skeleton variants={{ width: 'full' }} />
          </span>
          <span className={singleSignOnLoadingSkeletonStyles.line[24]}>
            <Skeleton variants={{ width: 'full' }} />
          </span>
        </div>
      </section>

      {/* Access Settings Section */}
      <section className={singleSignOnLoadingSkeletonStyles.section}>
        <span className={singleSignOnLoadingSkeletonStyles.line[36]}>
          <Skeleton variants={{ size: 'xl', width: 'full' }} />
        </span>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={singleSignOnLoadingSkeletonStyles.setting}>
            <div className={singleSignOnLoadingSkeletonStyles.settingText}>
              <span className={singleSignOnLoadingSkeletonStyles.line[40]}>
                <Skeleton variants={{ width: 'full' }} />
              </span>
              <span className={singleSignOnLoadingSkeletonStyles.line[72]}>
                <Skeleton variants={{ size: 'sm', width: 'full' }} />
              </span>
            </div>
            <span className={singleSignOnLoadingSkeletonStyles.settingToggle}>
              <Skeleton variants={{ shape: 'block' }} />
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
