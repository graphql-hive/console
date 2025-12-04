import { useCallback, useEffect, useRef, useState } from 'react';
import type { LabaratoryOperation } from '@/labaratory/lib/operations';

export interface LabaratoryTestTaskBase {
  id: string;
  next: string | null;
}

export interface LabaratoryTestTaskOperation extends LabaratoryTestTaskBase {
  type: 'operation';
  data: Pick<LabaratoryOperation, 'id'>;
}

export interface LabaratoryTestTaskUtlity extends LabaratoryTestTaskBase {
  type: 'utility';
  data: unknown;
}

export type LabaratoryTestTask = LabaratoryTestTaskOperation | LabaratoryTestTaskUtlity;

export interface LabaratoryTest {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  tasks: LabaratoryTestTask[];
}

export interface LabaratoryTestState {
  tests: LabaratoryTest[];
}

export interface LabaratoryTestActions {
  addTest: (test: Omit<LabaratoryTest, 'id' | 'createdAt' | 'tasks'>) => LabaratoryTest;
  addTaskToTest: (testId: string, task: Pick<LabaratoryTestTask, 'type' | 'data'>) => void;
  deleteTaskFromTest: (testId: string, taskId: string) => void;
  deleteTest: (testId: string) => void;
}

export const useTests = (props: {
  defaultTests?: LabaratoryTest[];
  onTestsChange?: (test: LabaratoryTest[]) => void;
}): LabaratoryTestState & LabaratoryTestActions => {
  const [tests, setTests] = useState<LabaratoryTest[]>(props.defaultTests ?? []);

  const testRef = useRef<LabaratoryTest[]>(tests);

  useEffect(() => {
    testRef.current = tests;
  }, [tests]);

  const addTest = useCallback(
    (item: Omit<LabaratoryTest, 'id' | 'createdAt' | 'tasks'>) => {
      const newItem: LabaratoryTest = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        tasks: [],
      } as LabaratoryTest;

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
    (testId: string, task: Pick<LabaratoryTestTask, 'type' | 'data'>) => {
      const newTask: LabaratoryTestTask = {
        ...task,
        id: crypto.randomUUID(),
        next: null,
      } as LabaratoryTestTask;

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
