// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { defineStepper } from './stepper';

const Stepper = defineStepper(
  { id: 'one', title: 'One' },
  { id: 'two', title: 'Two' },
  { id: 'three', title: 'Three' },
);

function Wizard(props: { defaultStep?: 'one' | 'two' | 'three' }) {
  return (
    <Stepper.StepperProvider variant="horizontal" defaultStep={props.defaultStep}>
      {({ stepper }) => (
        <>
          <Stepper.StepperNavigation>
            {stepper.steps.map(step => (
              <Stepper.StepperStep key={step.id} of={step.id} clickable={false}>
                <Stepper.StepperTitle>{step.title}</Stepper.StepperTitle>
              </Stepper.StepperStep>
            ))}
          </Stepper.StepperNavigation>
          {stepper.match({
            one: () => <p>Content one</p>,
            two: () => <p>Content two</p>,
            three: () => <p>Content three</p>,
          })}
          <Stepper.StepperControls>
            <button type="button" onClick={() => void stepper.prev()} disabled={stepper.isFirst}>
              Previous
            </button>
            <button type="button" onClick={() => void stepper.next()} disabled={stepper.isLast}>
              Next
            </button>
          </Stepper.StepperControls>
        </>
      )}
    </Stepper.StepperProvider>
  );
}

// The tab button's accessible name is the step number; the title sits beside it in the list item.
function itemOf(title: string) {
  return screen.getByText(title).closest('li');
}

function stateOf(title: string) {
  return itemOf(title)?.getAttribute('data-state');
}

describe('Stepper', () => {
  it('starts on the first step and renders its content', () => {
    render(<Wizard />);
    expect(itemOf('One')?.querySelector('[role="tab"]')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Content one')).toBeTruthy();
    expect(stateOf('One')).toBe('active');
    expect(stateOf('Two')).toBe('inactive');
  });

  it('moves forward and back, marking passed steps completed', async () => {
    render(<Wizard />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Content two');
    expect(stateOf('One')).toBe('completed');
    expect(stateOf('Two')).toBe('active');
    expect(stateOf('Three')).toBe('inactive');

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await screen.findByText('Content one');
    expect(stateOf('One')).toBe('active');
    expect(stateOf('Two')).toBe('inactive');
  });

  it('honours defaultStep', () => {
    render(<Wizard defaultStep="three" />);
    expect(screen.getByText('Content three')).toBeTruthy();
    expect(stateOf('One')).toBe('completed');
    expect(stateOf('Two')).toBe('completed');
    expect(stateOf('Three')).toBe('active');
    expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true);
  });
});
