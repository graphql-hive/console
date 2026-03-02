import { useLaboratory } from "@/components/laboratory/context";
import { Editor } from "@/components/laboratory/editor";

export const Env = () => {
  const { env, setEnv } = useLaboratory();

  return (
    <div className="bg-card size-full">
      <Editor
        defaultValue={Object.entries(env?.variables ?? {})
          .map(([key, value]) => `${key}=${value}`)
          .join("\n")}
        onChange={(value) => {
          setEnv({
            variables: Object.fromEntries(
              value
                ?.split("\n")
                .filter((line) => line.trim() && !line.trim().startsWith("#"))
                .map((line) => {
                  const parts = line.split(/=(.*)/s);

                  return [parts[0].trim(), (parts[1] ?? "").trim()];
                }) ?? []
            ),
          });
        }}
        language="dotenv"
        options={{
          scrollbar: {
            horizontal: "hidden",
          },
        }}
      />
    </div>
  );
};
