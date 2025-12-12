import { useCallback, useEffect, useRef, useState } from 'react';
import type { LaboratoryOperation } from '@/laboratory/lib/operations';

export interface LaboratoryTestTaskBase {
  id: string;
  next: string | null;
}

export interface LaboratoryTestTaskOperation extends LaboratoryTestTaskBase {
  type: 'operation';
  data: Pick<LaboratoryOperation, 'id'>;
}

export interface LaboratoryTestTaskUtlity extends LaboratoryTestTaskBase {
  type: 'utility';
  data: unknown;
}

export type LaboratoryTestTask = LaboratoryTestTaskOperation | LaboratoryTestTaskUtlity;

export interface LaboratoryTest {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  tasks: LaboratoryTestTask[];
}

export interface LaboratoryTestState {
  tests: LaboratoryTest[];
}

export interface LaboratoryTestActions {
  addTest: (test: Omit<LaboratoryTest, 'id' | 'createdAt' | 'tasks'>) => LaboratoryTest;
  addTaskToTest: (testId: string, task: Pick<LaboratoryTestTask, 'type' | 'data'>) => void;
  deleteTaskFromTest: (testId: string, taskId: string) => void;
  deleteTest: (testId: string) => void;
}

export const useTests = (props: {
  defaultTests?: LaboratoryTest[];
  onTestsChange?: (test: LaboratoryTest[]) => void;
}): LaboratoryTestState & LaboratoryTestActions => {
  const [tests, setTests] = useState<LaboratoryTest[]>(props.defaultTests ?? []);

  const testRef = useRef<LaboratoryTest[]>(tests);

  useEffect(() => {
    testRef.current = tests;
  }, [tests]);

  const addTest = useCallback(
    (item: Omit<LaboratoryTest, 'id' | 'createdAt' | 'tasks'>) => {
      const newItem: LaboratoryTest = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        tasks: [],
      } as LaboratoryTest;

      const newTest = [...tests, newItem];
      setTests(newTest);

      props.onTestsChange?.(newTest);

      return newItem;
    },
    [tests, props],
  );

  const deleteTest = useCallback(
    (testId: string) => {
      const newTest = testRef.current.filter(item => item.id !== testId);
      setTests(newTest);
      props.onTestsChange?.(newTest);
    },
    [props],
  );

  const addTaskToTest = useCallback(
    (testId: string, task: Pick<LaboratoryTestTask, 'type' | 'data'>) => {
      const newTask: LaboratoryTestTask = {
        ...task,
        id: crypto.randomUUID(),
        next: null,
      } as LaboratoryTestTask;

      const newTest = testRef.current.map(item =>
        item.id === testId ? { ...item, tasks: [...item.tasks, newTask] } : item,
      );
      setTests(newTest);
      props.onTestsChange?.(newTest);
    },
    [props],
  );

  const deleteTaskFromTest = useCallback(
    (testId: string, taskId: string) => {
      const newTest = testRef.current.map(item =>
        item.id === testId
          ? { ...item, tasks: item.tasks.filter(task => task.id !== taskId) }
          : item,
      );
      setTests(newTest);
      props.onTestsChange?.(newTest);
    },
    [props],
  );

  return {
    tests,
    addTest,
    deleteTest,
    addTaskToTest,
    deleteTaskFromTest,
  };
};
