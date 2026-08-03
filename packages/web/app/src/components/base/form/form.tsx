import { createContext, useContext, useId, type ReactElement, type ReactNode } from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

export const Form = FormProvider;

type FormFieldContextValue = { name: string };
const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemContextValue = { id: string };
const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState,
  };
}

export function FormItem({ children }: { children: ReactNode }) {
  const id = useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className="space-y-2">{children}</div>
    </FormItemContext.Provider>
  );
}

export function FormLabel({ label }: { label: string }) {
  const { formItemId } = useFormField();
  return (
    <label
      htmlFor={formItemId}
      className="text-neutral-10 mb-1 inline-block text-[9px] font-medium uppercase tracking-[0.75px]"
    >
      {label}
    </label>
  );
}

export function FormControl({ children }: { children: ReactElement }) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <div
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
    >
      {children}
    </div>
  );
}

export function FormDescription({ description }: { description: ReactElement | string }) {
  const { formDescriptionId } = useFormField();
  return (
    <p id={formDescriptionId} className="text-neutral-10 text-[13px]">
      {description}
    </p>
  );
}

export function FormMessage() {
  const { error, formMessageId } = useFormField();
  if (!error?.message) return null;
  return (
    <p id={formMessageId} className="text-sm font-medium text-red-500">
      {String(error.message)}
    </p>
  );
}
