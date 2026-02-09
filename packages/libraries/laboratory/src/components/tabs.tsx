import { Children, Fragment, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface ItemProps {
  label: string;
  children: React.ReactNode;
}

const Item = (_props: ItemProps) => {
  return null;
};

export interface TabsProps {
  children: (React.ReactElement<ItemProps> | null)[];
  suffix?: React.ReactNode;
}

export const Tabs = ({ children, suffix }: TabsProps) => {
  const filteredChildren = useMemo(() => {
    return children.filter((child) => child !== null);
  }, [children]);

  const [activeTab, setActiveTab] = useState<string | null>(
    filteredChildren[0].props.label ?? null
  );

  useEffect(() => {
    if (
      activeTab &&
      !filteredChildren.some((child) => child.props.label === activeTab)
    ) {
      setActiveTab(filteredChildren[0].props.label ?? null);
    }
  }, [activeTab, filteredChildren]);

  const activeChild = useMemo(() => {
    return (
      filteredChildren.find((child) => child.props.label === activeTab)?.props
        .children ?? null
    );
  }, [filteredChildren, activeTab]);

  return (
    <div className="grid size-full grid-rows-[auto_1fr] pb-0">
      <div className="bg-background relative z-10 flex h-12 w-full items-center overflow-hidden">
        <div className="bg-border absolute bottom-0 left-0 -z-10 h-px w-full" />
        <div className="flex h-full w-max items-stretch">
          {Children.map(filteredChildren, (child) => (
            <Fragment key={child?.props.label}>
              <div
                className={cn(
                  "text-muted-foreground hover:text-foreground group relative flex cursor-pointer items-center gap-2 border-t-2 border-transparent px-3 pb-1 font-medium transition-all",
                  {
                    "border-primary bg-card text-foreground-primary":
                      activeTab === child.props.label,
                  }
                )}
                onClick={() => setActiveTab(child.props.label)}
              >
                {child.props.label}
              </div>
              <div className="bg-border mb-px w-px" />
            </Fragment>
          ))}
        </div>
        {suffix}
      </div>
      <div className="size-full">{activeChild}</div>
    </div>
  );
};

Tabs.Item = Item;
