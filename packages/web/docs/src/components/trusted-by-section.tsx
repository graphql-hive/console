import { cn } from '@theguild/components';
import { AligentLogo, KarrotLogo, LinktreeLogo, MeetupLogo, SoundYXZLogo } from './company-logos';

export function TrustedBySection(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <div {...props} className={cn('max-w-[80%] text-center', props.className)}>
      <p className="text-base text-blue-800 dark:text-white/80">
        Trusted by global enterprises and fast-moving startups
      </p>
      <div className="text-blue-1000 mt-6 flex flex-row flex-wrap items-center justify-center gap-x-16 gap-y-6 dark:text-white">
        <MeetupLogo title="Meetup" height={32} className="translate-y-[5px]" />
        <LinktreeLogo title="Linktree" height={22} />
        <KarrotLogo title="Karrot" height={28} />
        <AligentLogo title="Aligent" height={32} />
        <SoundYXZLogo title="SoundXYZ" height={32} />
      </div>
    </div>
  );
}
