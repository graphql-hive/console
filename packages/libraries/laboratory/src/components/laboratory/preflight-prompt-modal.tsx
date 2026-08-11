import { useEffect, useRef } from 'react';
import * as z from 'zod';
import { useForm } from '@tanstack/react-form';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Field, FieldError, FieldGroup } from '../ui/field';
import { Input } from '../ui/input';

export const PreflightPromptModal = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  defaultValue?: string;
  onSubmit?: (value: string | null) => void;
}) => {
  const isAnsweredRef = useRef(false);

  // The script stays suspended on `lab.prompt()` until this modal answers, so every way of
  // leaving it has to answer, and only the first answer counts.
  const answer = (value: string | null) => {
    if (isAnsweredRef.current) {
      return;
    }

    isAnsweredRef.current = true;
    props.onSubmit?.(value);
  };

  // `onSubmit` is a fresh callback per prompt, so this also covers a prompt that replaces
  // another one while the dialog is open.
  useEffect(() => {
    if (props.open) {
      isAnsweredRef.current = false;
    }
  }, [props.open, props.onSubmit]);

  const form = useForm({
    defaultValues: {
      value: props.defaultValue || null,
    },
    validators: {
      onSubmit: z.object({
        value: z.string().min(1, 'Value is required').nullable(),
      }),
    },
    onSubmit: ({ value }) => {
      answer(value.value || null);
      props.onOpenChange(false);
      form.reset();
    },
  });

  return (
    <Dialog
      open={props.open}
      onOpenChange={open => {
        // Dismissing with an empty field fails validation, so `onSubmit` never runs and the
        // script would wait forever. Give the submit a chance, then answer with null.
        const submitted = form.state.isSubmitted ? Promise.resolve() : form.handleSubmit();

        void submitted
          .catch(() => {})
          .then(() => {
            if (!open) {
              answer(null);
            }
          });

        props.onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preflight prompt</DialogTitle>
        </DialogHeader>
        <DialogDescription>Enter values for the preflight script.</DialogDescription>
        <form
          id="preflight-prompt-form"
          onSubmit={e => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="value">
              {field => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value || ''}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder={props.placeholder}
                      autoComplete="off"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="preflight-prompt-form"
            onClick={() => {
              void form.handleSubmit();
            }}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
