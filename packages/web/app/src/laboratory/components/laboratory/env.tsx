import { useLaboratory } from '@/laboratory/components/laboratory/context';
import { Editor } from '@/laboratory/components/laboratory/editor';

export const Env = () => {
  const { env, setEnv } = useLaboratory();

  return (
    <div className="bg-card size-full">
      <Editor
        defaultValue={Object.entries(env?.variables ?? {})
          .map(([key, value]) => `${key}=${value}`)
          .join('\n')}
        onChange={value => {
          setEnv({
            variables:
              Object.fromEntries(value?.split('\n').map(line => line.split('=')) ?? []) ?? {},
          });
        }}
        language="dotenv"
        options={{
          scrollbar: {
            horizontal: 'hidden',
          },
        }}
      />
    </div>
  );
};
