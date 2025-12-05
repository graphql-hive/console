// import { Command } from "@/laboratory/components/laboratory/command";
// import {
//   LaboratoryProvider,
//   useLaboratory,
//   type LaboratoryContextProps,
// } from "@/laboratory/components/laboratory/context";
// import {
//   Query,
//   ResponseBody,
//   ResponseHeaders,
// } from "@/laboratory/components/laboratory/operation";
// import { Button } from "@/laboratory/components/ui/button";
// import {
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/laboratory/components/ui/dialog";
// import { Dialog } from "@/laboratory/components/ui/dialog";
// import { Input } from "@/laboratory/components/ui/input";
// import {
//   Field,
//   FieldError,
//   FieldGroup,
//   FieldLabel,
// } from "@/laboratory/components/ui/field";
// import { useCollections } from "@/laboratory/lib/collections";
// import { useEndpoint } from "@/laboratory/lib/endpoint";
// import { useHistory, type LaboratoryHistory } from "@/laboratory/lib/history";
// import { useOperations } from "@/laboratory/lib/operations";
// import { cn } from "@/laboratory/lib/utils";
// import {
//   CircleCheckIcon,
//   CircleXIcon,
//   ClockIcon,
//   FileCode2Icon,
//   FileIcon,
//   FileTextIcon,
//   FoldersIcon,
//   HistoryIcon,
// } from "lucide-react";
// import { useCallback, useState } from "react";
// import { useForm } from "@tanstack/react-form";
// import * as z from "zod";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/laboratory/components/ui/tabs";
// import { Tabs as MyTabs } from "@/laboratory/components/tabs";
// import { Tabs as LaboratoryTabs } from "@/laboratory/components/laboratory/tabs";
// import { Builder } from "@/laboratory/components/laboratory/builder";
// import { Badge } from "@/laboratory/components/ui/badge";
// import {
//   Empty,
//   EmptyContent,
//   EmptyDescription,
//   EmptyHeader,
//   EmptyMedia,
//   EmptyTitle,
// } from "@/laboratory/components/ui/empty";
// const addCollectionFormSchema = z.object({
//   name: z.string().min(1, "Name is required"),
// });

// const LaboratoryContent = () => {
//   const { activeOperation, addOperation } = useLaboratory();

//   const [activePanel, setActivePanel] = useState<
//     "collections" | "history" | null
//   >("collections");

//   const [selectedHistoryItem, setSelectedHistoryItem] =
//     useState<LaboratoryHistory | null>(null);

//   return (
//     <div className="w-full h-full flex flex-col relative">
//       <Command />
//       {!selectedHistoryItem ? (
//         <div
//           className="flex-1 flex flex-col"
//           style={{
//             viewTransitionName: "stack",
//           }}
//         >
//           {activeOperation ? (
//             <>
//               <LaboratoryTabs className="w-full h-12" />
//               <Tabs
//                 className="w-full flex-1 pt-3 flex flex-col items-stretch bg-card"
//                 defaultValue="editor"
//               >
//                 <div className="w-full px-3">
//                   <TabsList className="w-full">
//                     <TabsTrigger className="flex-1" value="editor">
//                       Editor
//                     </TabsTrigger>
//                     <TabsTrigger className="flex-1" value="builder">
//                       Builder
//                     </TabsTrigger>
//                   </TabsList>
//                 </div>
//                 <TabsContent value="builder">
//                   <div className="flex-1">
//                     <Builder />
//                   </div>
//                 </TabsContent>
//                 <TabsContent value="editor">
//                   <Query
//                     onAfterOperationRun={(historyItem) => {
//                       if ("startViewTransition" in document) {
//                         document.startViewTransition(() => {
//                           setSelectedHistoryItem(historyItem);
//                         });
//                       } else {
//                         setSelectedHistoryItem(historyItem);
//                       }
//                     }}
//                   />
//                 </TabsContent>
//               </Tabs>
//             </>
//           ) : (
//             <Empty className="w-full !px-0">
//               <EmptyHeader>
//                 <EmptyMedia variant="icon">
//                   <FileIcon className="size-6 text-muted-foreground" />
//                 </EmptyMedia>
//                 <EmptyTitle className="text-base">
//                   No operation selected
//                 </EmptyTitle>
//                 <EmptyDescription className="text-xs">
//                   You haven't selected any operation yet. Get started by
//                   selecting an operation or add a new one.
//                 </EmptyDescription>
//               </EmptyHeader>
//               <EmptyContent>
//                 <Button
//                   size="sm"
//                   onClick={() =>
//                     addOperation(
//                       {
//                         name: "",
//                         query: "",
//                         variables: "",
//                         headers: "",
//                         extensions: "",
//                       },
//                       {
//                         activate: true,
//                       }
//                     )
//                   }
//                 >
//                   Add operation
//                 </Button>
//               </EmptyContent>
//             </Empty>
//           )}
//         </div>
//       ) : (
//         <div
//           className="flex-1"
//           style={{
//             viewTransitionName: "stack",
//           }}
//         >
//           <MyTabs
//             suffix={
//               selectedHistoryItem ? (
//                 <div className="ml-auto flex items-center gap-2 pr-3">
//                   <Badge
//                     className={cn("bg-green-400/10 text-green-500", {
//                       "bg-red-400/10 text-red-500":
//                         selectedHistoryItem?.status < 200 ||
//                         selectedHistoryItem?.status >= 300,
//                     })}
//                   >
//                     {selectedHistoryItem?.status >= 200 &&
//                     selectedHistoryItem?.status < 300 ? (
//                       <CircleCheckIcon className="size-3" />
//                     ) : (
//                       <CircleXIcon className="size-3" />
//                     )}
//                     <span>{selectedHistoryItem?.status}</span>
//                   </Badge>
//                   <Badge variant="outline" className="bg-card">
//                     <ClockIcon className="size-3" />
//                     <span>{Math.round(selectedHistoryItem?.duration)}ms</span>
//                   </Badge>
//                   <Badge variant="outline" className="bg-card">
//                     <FileTextIcon className="size-3" />
//                     <span>
//                       {Math.round(selectedHistoryItem?.size / 1024)}KB
//                     </span>
//                   </Badge>
//                 </div>
//               ) : null
//             }
//           >
//             <MyTabs.Item label="Response">
//               <ResponseBody historyItem={selectedHistoryItem} />
//             </MyTabs.Item>
//             <MyTabs.Item label="Headers">
//               <ResponseHeaders historyItem={selectedHistoryItem} />
//             </MyTabs.Item>
//           </MyTabs>
//         </div>
//       )}
//       <div className="w-full h-12 flex border-t border-border">
//         <div
//           className={cn(
//             "w-full relative z-10 h-12 aspect-square flex items-center justify-center border-t-2 border-transparent",
//             {
//               "border-primary": activePanel === "collections",
//             }
//           )}
//         >
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() =>
//               setActivePanel(
//                 activePanel === "collections" ? null : "collections"
//               )
//             }
//             className={cn("text-muted-foreground hover:text-foreground", {
//               "text-foreground": activePanel === "collections",
//             })}
//           >
//             <FileCode2Icon className="size-5" />
//           </Button>
//         </div>
//         <div
//           className={cn(
//             "w-full relative z-10 h-12 aspect-square flex items-center justify-center border-t-2 border-transparent"
//           )}
//         >
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() =>
//               setActivePanel(
//                 activePanel === "collections" ? null : "collections"
//               )
//             }
//             className={cn("text-muted-foreground hover:text-foreground")}
//           >
//             <FoldersIcon className="size-5" />
//           </Button>
//         </div>
//         <div
//           className={cn(
//             "w-full relative z-10 h-12 aspect-square flex items-center justify-center border-t-2 border-transparent",
//             {
//               "border-primary": activePanel === "history",
//             }
//           )}
//         >
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() =>
//               setActivePanel(activePanel === "history" ? null : "history")
//             }
//             className={cn("text-muted-foreground hover:text-foreground", {
//               "text-foreground": activePanel === "history",
//             })}
//           >
//             <HistoryIcon className="size-5" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export type LaboratoryProps = LaboratoryContextProps;

// export const LaboratoryMobile = (
//   props: Pick<
//     LaboratoryProps,
//     | "defaultEndpoint"
//     | "defaultCollections"
//     | "onCollectionsChange"
//     | "defaultOperations"
//     | "onOperationsChange"
//     | "defaultActiveOperationId"
//     | "onActiveOperationIdChange"
//     | "defaultHistory"
//     | "onHistoryChange"
//   >
// ) => {
//   const endpointApi = useEndpoint(props);
//   const collectionsApi = useCollections(props);
//   const operationsApi = useOperations({
//     ...props,
//     collectionsApi,
//   });
//   const historyApi = useHistory(props);

//   const [isAddCollectionDialogOpen, setIsCollectionDialogOpen] =
//     useState(false);

//   const openAddCollectionDialog = useCallback(() => {
//     setIsCollectionDialogOpen(true);
//   }, []);

//   const addCollectionForm = useForm({
//     defaultValues: {
//       name: "",
//     },
//     validators: {
//       onSubmit: addCollectionFormSchema,
//     },
//     onSubmit: ({ value }) => {
//       collectionsApi.addCollection({
//         name: value.name,
//       });
//       setIsCollectionDialogOpen(false);
//     },
//   });

//   return (
//     <div className="w-full h-full">
//       <Dialog
//         open={isAddCollectionDialogOpen}
//         onOpenChange={setIsCollectionDialogOpen}
//       >
//         <DialogContent className="sm:max-w-[425px]">
//           <DialogHeader>
//             <DialogTitle>Add collection</DialogTitle>
//             <DialogDescription>
//               Add a new collection of operations to your laboratory.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="grid gap-4">
//             <form
//               id="add-collection-form"
//               onSubmit={(e) => {
//                 e.preventDefault();
//                 addCollectionForm.handleSubmit();
//               }}
//             >
//               <FieldGroup>
//                 <addCollectionForm.Field
//                   name="name"
//                   children={(field) => {
//                     const isInvalid =
//                       field.state.meta.isTouched && !field.state.meta.isValid;
//                     return (
//                       <Field data-invalid={isInvalid}>
//                         <FieldLabel htmlFor={field.name}>Name</FieldLabel>
//                         <Input
//                           id={field.name}
//                           name={field.name}
//                           value={field.state.value}
//                           onBlur={field.handleBlur}
//                           onChange={(e) => field.handleChange(e.target.value)}
//                           aria-invalid={isInvalid}
//                           placeholder="Enter name of the collection"
//                           autoComplete="off"
//                         />
//                         {isInvalid && (
//                           <FieldError errors={field.state.meta.errors} />
//                         )}
//                       </Field>
//                     );
//                   }}
//                 />
//               </FieldGroup>
//             </form>
//           </div>
//           <DialogFooter>
//             <DialogClose asChild>
//               <Button variant="outline">Cancel</Button>
//             </DialogClose>
//             <Button type="submit" form="add-collection-form">
//               Add collection
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <LaboratoryProvider
//         {...props}
//         {...endpointApi}
//         {...collectionsApi}
//         {...operationsApi}
//         {...historyApi}
//         openAddCollectionDialog={openAddCollectionDialog}
//       >
//         <LaboratoryContent />
//       </LaboratoryProvider>
//     </div>
//   );
// };
