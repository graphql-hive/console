import { GlobeIcon } from "lucide-react";
import { Editor } from "@/components/laboratory/editor";
import { LaboratoryPlugin } from "@/lib/plugins";

export const TargetEnvPlugin = (props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) => {
  const targetId = `${props.organizationSlug}/${props.projectSlug}/${props.targetSlug}`;

  return {
    id: "targetEnv",
    name: "Target Environment",
    description: "Environment variables for the target",
    preflight: {
      lab: {
        definition: `
          targetEnvironment: {
            set: (key: string, value: string) => void;
            get: (key: string) => string;
            delete: (key: string) => void;
          };
        `,
        props: {
          targetId,
        },
        object: (props, state, setState) => {
          return {
            targetEnvironment: {
              set: (key: string, value: string) => {
                setState({
                  ...state,
                  [props.targetId]: {
                    ...state[props.targetId],
                    [key]: value,
                  },
                });
              },
              get: (key: string) => {
                return state[props.targetId]?.[key];
              },
              delete: (key: string) => {
                const newState = JSON.parse(JSON.stringify(state));

                delete newState[props.targetId][key];

                setState(newState);
              },
            },
          };
        },
      },
    },
    commands: [
      {
        name: "Open Target Environment Variables",
        icon: <GlobeIcon />,
        onClick: (laboratory) => {
          const tab =
            laboratory.tabs.find((t) => t.type === "target-env") ??
            laboratory.addTab({
              type: "target-env",
              data: {},
            });

          laboratory.setActiveTab(tab);
        },
      },
    ],
    tabs: [
      {
        type: "target-env",
        name: "Target Environment Variables",
        icon: <GlobeIcon className="size-4 text-orange-400" />,
        component: (_tab, _laboratory, state, setState) => {
          return (
            <Editor
              defaultValue={Object.entries(state?.[targetId] ?? {})
                .map(([key, value]) => `${key}=${value}`)
                .join("\n")}
              onChange={(value) => {
                setState({
                  ...state,
                  [targetId]: Object.fromEntries(
                    value
                      ?.split("\n")
                      .filter(
                        (line) => line.trim() && !line.trim().startsWith("#")
                      )
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
          );
        },
      },
    ],
  } satisfies LaboratoryPlugin<Record<string, Record<string, string>>>;
};
